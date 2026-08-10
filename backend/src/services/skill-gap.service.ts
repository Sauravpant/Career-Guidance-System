import fs from "fs";
import path from "path";
import prisma from "../configs/db";
import { AppError } from "../utils/app-error";

let _cachedSkillsData: Record<string, string[]> | null = null;

class SkillGapService {

  private loadRawSkillsData(): Record<string, string[]> {

    if (_cachedSkillsData) return _cachedSkillsData;

    const possiblePaths = [
      path.join(__dirname, "../data/career-skills.json"),
      path.join(process.cwd(), "src/data/career-skills.json"),
      path.join(process.cwd(), "dist/data/career-skills.json"),
      path.join(process.cwd(), "backend/src/data/career-skills.json"),
    ];

    for (const p of possiblePaths) {

      if (fs.existsSync(p)) {
        try {
          _cachedSkillsData = JSON.parse(fs.readFileSync(p, "utf-8"));

          return _cachedSkillsData!;
        } catch (e) {
          console.error(`Error parsing career-skills.json from path ${p}:`, e);
        }
      }
    }

    _cachedSkillsData = {
      "AI/ML Engineer": [
        "Python",
        "Machine Learning",
        "Deep Learning",
        "TensorFlow",
        "PyTorch",
        "Scikit-Learn",
        "Pandas",
        "NumPy",
        "SQL",
        "Git",
        "Math & Statistics",
        "Data Preprocessing",
        "NLP",
        "Computer Vision",
        "LLMs & Prompt Engineering",
      ],
      "Data Scientist": [
        "Python",
        "R",
        "SQL",
        "Machine Learning",
        "Data Visualization",
        "Pandas",
        "NumPy",
        "Statistics",
        "Tableau",
        "Big Data",
        "Feature Engineering",
        "Jupyter Notebooks",
        "PowerBI",
        "A/B Testing",
      ],
      "Data Analyst": [
        "SQL",
        "Excel",
        "Tableau",
        "PowerBI",
        "Python",
        "R",
        "Data Visualization",
        "Data Cleaning",
        "Statistics",
        "Business Intelligence",
        "Data Warehousing",
        "Google Analytics",
      ],
      "Python Developer": [
        "Python",
        "Django",
        "Flask",
        "FastAPI",
        "SQL",
        "Git",
        "REST APIs",
        "Docker",
        "Pytest",
        "Data Structures",
        "Algorithms",
        "Object-Oriented Programming",
        "Asynchronous Programming",
      ],
      "Software Engineer": [
        "Data Structures",
        "Algorithms",
        "System Design",
        "Java",
        "C++",
        "Python",
        "Git",
        "Object-Oriented Programming",
        "Databases",
        "Software Design Patterns",
        "CI/CD",
        "Unit Testing",
        "Agile Methodologies",
      ],
      "Full Stack Developer": [
        "HTML",
        "CSS",
        "JavaScript",
        "TypeScript",
        "React",
        "Node.js",
        "Express",
        "SQL",
        "MongoDB",
        "Git",
        "REST APIs",
        "Next.js",
        "Tailwind CSS",
        "GraphQL",
      ],
      "QA Engineer": [
        "Selenium",
        "Cypress",
        "Playwright",
        "Manual Testing",
        "Automated Testing",
        "JavaScript",
        "Python",
        "Git",
        "CI/CD",
        "Test Planning",
        "API Testing",
        "Load Testing",
        "Bug Tracking (Jira)",
      ],
      "DevOps Engineer": [
        "Docker",
        "Kubernetes",
        "AWS",
        "CI/CD",
        "Linux",
        "Bash",
        "Git",
        "Terraform",
        "Ansible",
        "Jenkins",
        "Monitoring",
        "Networking",
        "GitHub Actions",
      ],
    };

    return _cachedSkillsData!;
  }

  /**
   * Returns the available career track names from the JSON pool.
   */
  getAvailableCareers(): string[] {

    const rawData = this.loadRawSkillsData();

    return Object.keys(rawData);
  }

  private resolveCareerName(
    rawData: Record<string, string[]>,
    input: string,
  ): string | undefined {

    const needle = input.toLowerCase().trim();
    const exact = Object.keys(rawData).find(
      (k) => k.toLowerCase().trim() === needle,
    );

    if (exact) return exact;

    const partial = Object.keys(rawData).find((k) => {
      const haystack = k.toLowerCase().trim();

      return haystack.includes(needle) || needle.includes(haystack);
    });

    if (partial) return partial;

    const inputWords = needle.split(/\s+/);
    let bestKey: string | undefined;
    let bestOverlap = 0;

    for (const key of Object.keys(rawData)) {

      const keyWords = key.toLowerCase().trim().split(/\s+/);
      const overlap = inputWords.filter((w) => keyWords.includes(w)).length;
      const score = overlap / Math.max(inputWords.length, keyWords.length);

      if (score > bestOverlap) {
        bestOverlap = score;
        bestKey = key;
      }
    }

    if (bestOverlap >= 0.5 && bestKey) return bestKey;

    return undefined;
  }

  private async getEffectiveUserSkills(
    userId: string,
  ): Promise<{ skillSet: Set<string>; skills: string[] }> {

    const [user, completedProgress] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { skills: true },
      }),
      prisma.skillProgress.findMany({
        where: { userId, status: "COMPLETED" },
        select: { skillName: true },
      }),
    ]);

    const skillSet = new Set<string>();
    const profileSkills: string[] = user?.skills ?? [];

    for (const s of profileSkills) {
      skillSet.add(s.toLowerCase().trim());
    }

    for (const sp of completedProgress) {
      skillSet.add(sp.skillName.toLowerCase().trim());
    }

    return { skillSet, skills: profileSkills };
  }

  async runAnalysis(userId: string, careerName: string) {

    const rawSkillsData = this.loadRawSkillsData();
    const canonicalCareerName = this.resolveCareerName(
      rawSkillsData,
      careerName,
    );

    if (!canonicalCareerName) {

      const available = Object.keys(rawSkillsData).join(", ");
      throw new AppError(
        400,
        `Career track '${careerName}' not found in skill pool. Available tracks: ${available}`,
      );
    }

    const requiredSkills = rawSkillsData[canonicalCareerName] || [];
    const { skillSet: effectiveUserSkills, skills: profileSkills } =
      await this.getEffectiveUserSkills(userId);

    if (effectiveUserSkills.size === 0) {

      const userCheck = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!userCheck) throw new AppError(404, "User not found");
    }

    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const reqSkill of requiredSkills) {

      if (effectiveUserSkills.has(reqSkill.toLowerCase().trim())) {
        matchingSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    }

    const score =
      requiredSkills.length > 0
        ? (matchingSkills.length / requiredSkills.length) * 100
        : 100;

    const historyEntry = await prisma.skillGapHistory.create({
      data: {
        userId,
        careerName: canonicalCareerName,
        score,
        matchingSkills,
        missingSkills,
      },
    });
    await Promise.all([
      ...missingSkills.map((mSkill) =>
        prisma.skillProgress.upsert({
          where: {
            userId_skillName: { userId, skillName: mSkill.toLowerCase() },
          },
          update: {},
          create: {
            userId,
            skillName: mSkill.toLowerCase(),
            status: "WANT_TO_LEARN",
          },
        }),
      ),
      ...matchingSkills.map((matchSkill) =>
        prisma.skillProgress.upsert({
          where: {
            userId_skillName: { userId, skillName: matchSkill.toLowerCase() },
          },
          update: { status: "COMPLETED" },
          create: {
            userId,
            skillName: matchSkill.toLowerCase(),
            status: "COMPLETED",
          },
        }),
      ),
    ]);

    const currentSkillsSet = new Set(
      profileSkills.map((s) => s.toLowerCase().trim()),
    );

    const newProfileSkills = [...profileSkills];

    for (const matchSkill of matchingSkills) {

      if (!currentSkillsSet.has(matchSkill.toLowerCase().trim())) {
        newProfileSkills.push(matchSkill);
        currentSkillsSet.add(matchSkill.toLowerCase().trim());
      }
    }

    if (newProfileSkills.length !== profileSkills.length) {
      await prisma.user.update({
        where: { id: userId },
        data: { skills: newProfileSkills },
        select: { id: true },
      });
    }

    return historyEntry;
  }

  async getHistory(userId: string) {

    return prisma.skillGapHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSkillProgress(userId: string) {

    return prisma.skillProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async upsertSkillProgress(
    userId: string,
    skillName: string,
    status: string,
    score: number = 0.0,
  ) {

    const normalizedSkill = skillName.toLowerCase().trim();
    const [progress, user] = await Promise.all([
      prisma.skillProgress.upsert({
        where: {
          userId_skillName: {
            userId,
            skillName: normalizedSkill,
          },
        },
        update: { status, score },
        create: { userId, skillName: normalizedSkill, status, score },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { skills: true },
      }),
    ]);

    if (!user) return progress;

    const skillsSet = new Set(user.skills.map((s) => s.toLowerCase().trim()));

    if (status === "COMPLETED") {

      if (!skillsSet.has(normalizedSkill)) {
        await prisma.user.update({
          where: { id: userId },
          data: { skills: [...user.skills, skillName.trim()] },
          select: { id: true },
        });
      }

    } else if (status === "LEARNING" || status === "WANT_TO_LEARN") {

      if (skillsSet.has(normalizedSkill)) {

        const filteredSkills = user.skills.filter(
          (s) => s.toLowerCase().trim() !== normalizedSkill,
        );
        await prisma.user.update({
          where: { id: userId },
          data: { skills: filteredSkills },
          select: { id: true },
        });
      }
    }

    return progress;
  }
}

export default new SkillGapService();
