import fs from "fs";
import path from "path";
import prisma from "../configs/db";
import { AppError } from "../utils/app-error";

class SkillGapService {
  private loadRawSkillsData(): Record<string, string[]> {
    const possiblePaths = [
      path.join(__dirname, "../data/career-skills.json"),
      path.join(process.cwd(), "src/data/career-skills.json"),
      path.join(process.cwd(), "dist/data/career-skills.json"),
      path.join(process.cwd(), "backend/src/data/career-skills.json"),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, "utf-8"));
        } catch (e) {
          console.error(`Error parsing career-skills.json from path ${p}:`, e);
        }
      }
    }
    // Fallback dictionary
    return {
      "AI/ML Engineer": [
        "Python", "Machine Learning", "Deep Learning", "TensorFlow",
        "PyTorch", "Scikit-Learn", "Pandas", "NumPy", "SQL", "Git",
        "Math & Statistics", "Data Preprocessing", "NLP", "Computer Vision", "LLMs & Prompt Engineering"
      ],
      "Data Scientist": [
        "Python", "R", "SQL", "Machine Learning", "Data Visualization",
        "Pandas", "NumPy", "Statistics", "Tableau", "Big Data",
        "Feature Engineering", "Jupyter Notebooks", "PowerBI", "A/B Testing"
      ],
      "Data Analyst": [
        "SQL", "Excel", "Tableau", "PowerBI", "Python", "R",
        "Data Visualization", "Data Cleaning", "Statistics", "Business Intelligence",
        "Data Warehousing", "Google Analytics"
      ],
      "Python Developer": [
        "Python", "Django", "Flask", "FastAPI", "SQL", "Git",
        "REST APIs", "Docker", "Pytest", "Data Structures", "Algorithms",
        "Object-Oriented Programming", "Asynchronous Programming"
      ],
      "Software Engineer": [
        "Data Structures", "Algorithms", "System Design", "Java", "C++",
        "Python", "Git", "Object-Oriented Programming", "Databases",
        "Software Design Patterns", "CI/CD", "Unit Testing", "Agile Methodologies"
      ],
      "Full Stack Developer": [
        "HTML", "CSS", "JavaScript", "TypeScript", "React", "Node.js",
        "Express", "SQL", "MongoDB", "Git", "REST APIs", "Next.js", "Tailwind CSS", "GraphQL"
      ],
      "QA Engineer": [
        "Selenium", "Cypress", "Playwright", "Manual Testing", "Automated Testing",
        "JavaScript", "Python", "Git", "CI/CD", "Test Planning", "API Testing",
        "Load Testing", "Bug Tracking (Jira)"
      ],
      "DevOps Engineer": [
        "Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Bash", "Git",
        "Terraform", "Ansible", "Jenkins", "Monitoring", "Networking", "GitHub Actions"
      ]
    };
  }

  /**
   * Returns the available career track names from the JSON pool.
   */
  getAvailableCareers(): string[] {
    const rawData = this.loadRawSkillsData();
    return Object.keys(rawData);
  }

  /**
   * Fuzzy-find the canonical career name. Tries:
   * 1. Exact case-insensitive match
   * 2. Partial / word-boundary match (the user input is a substring of a key or vice-versa)
   */
  private resolveCareerName(
    rawData: Record<string, string[]>,
    input: string
  ): string | undefined {
    const needle = input.toLowerCase().trim();

    // 1. Exact match
    const exact = Object.keys(rawData).find(
      (k) => k.toLowerCase().trim() === needle
    );
    if (exact) return exact;

    // 2. One side is a substring of the other
    const partial = Object.keys(rawData).find((k) => {
      const haystack = k.toLowerCase().trim();
      return haystack.includes(needle) || needle.includes(haystack);
    });
    if (partial) return partial;

    // 3. Word-overlap score: at least 50% of input words match a key's words
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

    // Only accept if word-overlap is >= 50%
    if (bestOverlap >= 0.5 && bestKey) return bestKey;

    return undefined;
  }

  /**
   * Build the effective set of user skills by merging:
   *   - user.skills[] (raw profile array — mixed case)
   *   - SkillProgress rows with status === 'COMPLETED' (added via Skill Inventory UI)
   *
   * Returns a Set of lowercased, trimmed skill strings for comparison.
   */
  private async getEffectiveUserSkills(userId: string): Promise<Set<string>> {
    const [user, completedProgress] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { skills: true } }),
      prisma.skillProgress.findMany({
        where: { userId, status: "COMPLETED" },
        select: { skillName: true },
      }),
    ]);

    const skillSet = new Set<string>();

    if (user) {
      for (const s of user.skills) {
        skillSet.add(s.toLowerCase().trim());
      }
    }

    for (const sp of completedProgress) {
      skillSet.add(sp.skillName.toLowerCase().trim());
    }

    return skillSet;
  }

  async runAnalysis(userId: string, careerName: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, "User not found");

    const rawSkillsData = this.loadRawSkillsData();

    // Resolve the career name (with fuzzy matching)
    const canonicalCareerName = this.resolveCareerName(rawSkillsData, careerName);

    if (!canonicalCareerName) {
      const available = Object.keys(rawSkillsData).join(", ");
      throw new AppError(
        400,
        `Career track '${careerName}' not found in skill pool. Available tracks: ${available}`
      );
    }

    const requiredSkills = rawSkillsData[canonicalCareerName] || [];

    // Get the merged skill set: profile skills + COMPLETED progress skills
    const effectiveUserSkills = await this.getEffectiveUserSkills(userId);

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

    // Save to history
    const historyEntry = await prisma.skillGapHistory.create({
      data: {
        userId,
        careerName: canonicalCareerName,
        score,
        matchingSkills,
        missingSkills,
      },
    });

    // Upsert missing skills into SkillProgress as WANT_TO_LEARN (don't overwrite existing progress)
    for (const mSkill of missingSkills) {
      await prisma.skillProgress.upsert({
        where: { userId_skillName: { userId, skillName: mSkill.toLowerCase() } },
        update: {}, // preserve existing status if user already started learning
        create: {
          userId,
          skillName: mSkill.toLowerCase(),
          status: "WANT_TO_LEARN",
        },
      });
    }

    // Upsert matching skills as COMPLETED in SkillProgress
    for (const matchSkill of matchingSkills) {
      await prisma.skillProgress.upsert({
        where: { userId_skillName: { userId, skillName: matchSkill.toLowerCase() } },
        update: { status: "COMPLETED" },
        create: {
          userId,
          skillName: matchSkill.toLowerCase(),
          status: "COMPLETED",
        },
      });
    }

    // Ensure all matching skills also exist in user.skills profile array
    const currentSkillsSet = new Set(user.skills.map((s) => s.toLowerCase().trim()));
    const newProfileSkills = [...user.skills];
    for (const matchSkill of matchingSkills) {
      if (!currentSkillsSet.has(matchSkill.toLowerCase().trim())) {
        newProfileSkills.push(matchSkill);
        currentSkillsSet.add(matchSkill.toLowerCase().trim());
      }
    }
    if (newProfileSkills.length !== user.skills.length) {
      await prisma.user.update({
        where: { id: userId },
        data: { skills: newProfileSkills },
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
    score: number = 0.0
  ) {
    const normalizedSkill = skillName.toLowerCase().trim();

    const progress = await prisma.skillProgress.upsert({
      where: {
        userId_skillName: {
          userId,
          skillName: normalizedSkill,
        },
      },
      update: {
        status,
        score,
      },
      create: {
        userId,
        skillName: normalizedSkill,
        status,
        score,
      },
    });

    // If status is COMPLETED, ensure the skill is added to User.skills array
    if (status === "COMPLETED") {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const skillsSet = new Set(user.skills.map((s) => s.toLowerCase().trim()));
        if (!skillsSet.has(normalizedSkill)) {
          const updatedSkills = [...user.skills, skillName.trim()];
          await prisma.user.update({
            where: { id: userId },
            data: { skills: updatedSkills },
          });
        }
      }
    }

    // If status is reverted from COMPLETED (LEARNING / WANT_TO_LEARN),
    // remove from user.skills to keep them in sync
    if (status === "LEARNING" || status === "WANT_TO_LEARN") {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const filteredSkills = user.skills.filter(
          (s) => s.toLowerCase().trim() !== normalizedSkill
        );
        if (filteredSkills.length !== user.skills.length) {
          await prisma.user.update({
            where: { id: userId },
            data: { skills: filteredSkills },
          });
        }
      }
    }

    return progress;
  }
}

export default new SkillGapService();
