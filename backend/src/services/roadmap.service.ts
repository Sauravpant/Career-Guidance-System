import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import prisma from "../configs/db";
import { AppError } from "../utils/app-error";
import { TYPE } from "../generated/prisma";
import fs from "fs";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function getCanonicalCareerName(careerName: string): string {
  const possiblePaths = [
    path.join(__dirname, "../data/career-skills.json"),
    path.join(process.cwd(), "src/data/career-skills.json"),
    path.join(process.cwd(), "dist/data/career-skills.json"),
    path.join(process.cwd(), "backend/src/data/career-skills.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const rawData = JSON.parse(fs.readFileSync(p, "utf-8"));
        const matchedKey = Object.keys(rawData).find(
          (k) => k.toLowerCase().trim() === careerName.toLowerCase().trim(),
        );
        if (matchedKey) return matchedKey;
      } catch (e) {
        console.error(
          "Error reading career-skills.json in roadmap service:",
          e,
        );
      }
    }
  }
  return careerName; // Fallback to original
}

function formatSteps(steps: any): string {
  if (!steps) return "";
  if (typeof steps === "string") return steps;
  if (Array.isArray(steps)) {
    return steps.map((s) => {
      if (typeof s === "string") {
        return s;
      }
      return JSON.stringify(s);
    }).join("\n");
  }
  if (typeof steps === "object") {
    return JSON.stringify(steps);
  }
  return String(steps);
}

class RoadmapService {
  async generateRoadmap(userId: string, careerName: string) {
    // If user already has a roadmap, return the latest one instead of generating
    const existingRoadmap = await prisma.roadmap.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (existingRoadmap) {
      return this.getRoadmap(existingRoadmap.id, userId);
    }

    if (!GEMINI_API_KEY) {
      throw new AppError(
        500,
        "Gemini API key is not configured in the backend environment.",
      );
    }

    const canonicalCareerName = getCanonicalCareerName(careerName);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const { education, experience, skills } = user;
    console.log(
      `Generating roadmap for user ${userId} for career: ${canonicalCareerName}`,
    );

    const prompt = `
You are an expert Career Mentor, Senior Software Architect, Technical Interviewer, and Curriculum Designer.

Your task is to generate a COMPLETE and HIGHLY DETAILED learning roadmap for becoming a professional "${canonicalCareerName}".

The roadmap should be equivalent in quality to roadmap.sh, a university curriculum, or a professional bootcamp.

User Profile

Education:
${education || "Not specified"}

Experience:
${experience || 0} years

Current Skills:
${skills.length ? skills.join(", ") : "None"}

-------------------------

GENERAL RULES

1. Generate EXACTLY 8 sequential phases.

2. Never generate fewer than 8 phases.

3. Every phase should build naturally on previous phases.

4. Assume the goal is to become JOB READY.

5. Do NOT skip important concepts.

6. Fill knowledge gaps based on the user's current skills.

7. Adapt the difficulty according to the user's experience.

8. If the user already knows something, include it only as a review instead of teaching from scratch.

9. Do NOT repeat topics between phases.

10. Every resource MUST be a REAL website.

11. Never invent URLs.

12. Prefer official documentation whenever possible.

13. Output ONLY valid JSON.

14. No markdown.

15. No explanation outside JSON.

-------------------------

Generate EXACTLY this JSON structure:

{
"title":"",
"career":"",
"estimatedCompletionTime":"",
"difficulty":"",
"requiredSkills":[],
"phases":[
{
"phaseNumber":1,
"title":"",
"description":"",
"estimatedDuration":"",
"prerequisites":[],
"learningOutcomes":[],
"topics":[],
"resources":[
{
"title":"",
"description":"",
"type":"",
"url":""
}
],
"projects":[
{
"title":"",
"description":"",
"difficulty":"",
"estimatedDuration":"",
"features":[],
"steps":[]
}
],
"milestone":""
}
],
"globalResources":[
{
"title":"",
"description":"",
"type":"",
"url":""
}
],
"globalProjects":[
{
"title":"",
"description":"",
"difficulty":"",
"estimatedDuration":"",
"features":[],
"steps":[]
}
]
}

-------------------------

DETAILED REQUIREMENTS

Roadmap

Generate exactly 8 phases.

Each phase should represent approximately:

4–8 weeks of learning.

Entire roadmap should span roughly

9–15 months.

-------------------------

Every phase MUST contain

• Title

• Description

120–200 words

Explain:

- Why this phase matters

- What will be learned

- How it connects to the next phase

- Expected outcome

-------------------------

Topics

Generate

8–15 detailed topics.

Avoid broad titles.

Instead of

React

Write

React Components

JSX

Props

State

Hooks

React Router

Performance Optimization

Testing

Error Boundaries

etc.

-------------------------

Prerequisites

3–6 prerequisites

-------------------------

Learning Outcomes

Generate 5–8 outcomes.

Example

"Can build responsive websites."

"Can deploy a REST API."

-------------------------

Resources

Generate 4–6 resources.

Mix:

Official Documentation

roadmap.sh

MDN

freeCodeCamp

Microsoft Learn

Google Developers

AWS Docs

React Docs

Node Docs

Python Docs

FastAPI Docs

MongoDB Docs

PostgreSQL Docs

Coursera (free where applicable)

YouTube Playlists

Each resource must contain

Title

Description

Type

URL

-------------------------

Projects

Generate EXACTLY TWO projects per phase.

Every project must include

Title

Description

Difficulty

Estimated Duration

8–12 Features

8–15 Step-by-step implementation steps

Projects should become progressively harder.

-------------------------

Milestone

Each phase must end with one milestone.

Example

"Deploy your first production-ready full-stack application."

-------------------------

Global Resources

Generate 8 high-quality learning resources.

-------------------------

Global Projects

Generate EXACTLY THREE capstone projects.

Each project must include

Title

Description

Difficulty

Estimated Duration

10–15 Features

10–20 Implementation Steps

-------------------------

Career-Specific Guidance

Tailor the roadmap specifically for "${canonicalCareerName}".

Include industry-standard tools, technologies, frameworks, deployment methods, testing strategies, version control, CI/CD, cloud platforms, security, debugging, optimization, and interview preparation wherever applicable.

-------------------------

Final Validation

Before returning the JSON verify that:

✓ Exactly 8 phases exist.

✓ Every phase has 8–15 topics.

✓ Every phase has exactly 2 projects.

✓ Every phase has 4–6 resources.

✓ Every phase has 5–8 learning outcomes.

✓ Every phase has 3–6 prerequisites.

✓ URLs are valid.

✓ JSON is valid.

Return ONLY raw JSON.
`;

    let roadmapData: any;
    try {
      if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured");
      }
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(prompt);
      const generatedText = result.response.text();
      roadmapData = JSON.parse(generatedText.trim());
    } catch (geminiError: any) {
      console.warn(
        "Gemini generation failed, trying Groq fallback... Error:",
        geminiError.message,
      );

      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        throw new AppError(
          500,
          `Failed to generate roadmap from Gemini: ${geminiError.message}. Groq fallback not configured (missing GROQ_API_KEY).`,
        );
      }

      try {
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are an expert career guidance counselor and senior software architect. Generate structured learning roadmaps. Output JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
        });

        const generatedText = chatCompletion.choices[0]?.message?.content || "";
        if (!generatedText) {
          throw new Error("Empty response from Groq");
        }
        roadmapData = JSON.parse(generatedText.trim());
      } catch (groqError: any) {
        console.error("Groq fallback also failed. Error:", groqError.message);
        throw new AppError(
          500,
          `Failed to generate roadmap. Gemini error: ${geminiError.message}. Groq fallback error: ${groqError.message}`,
        );
      }
    }

    try {
      // Find or create Career
      let career = await prisma.career.findFirst({
        where: {
          name: {
            equals: canonicalCareerName,
            mode: "insensitive",
          },
        },
      });

      if (!career) {
        career = await prisma.career.create({
          data: {
            name: canonicalCareerName,
            requiredSkills: roadmapData.requiredSkills || [],
          },
        });
      }

      // Create Roadmap
      const roadmap = await prisma.roadmap.create({
        data: {
          userId,
          careerId: career.id,
          title: roadmapData.title || `Roadmap for ${canonicalCareerName}`,
        },
      });

      // Create Phases, Resources, Projects
      if (roadmapData.phases && Array.isArray(roadmapData.phases)) {
        for (const phase of roadmapData.phases) {
          const createdPhase = await prisma.roadmapPhase.create({
            data: {
              roadmapId: roadmap.id,
              phaseNumber: Number(phase.phaseNumber),
              title: phase.title,
              description: phase.description,
              topics: phase.topics || [],
            },
          });

          // Phase Resources
          if (phase.resources && Array.isArray(phase.resources)) {
            for (const res of phase.resources) {
              await prisma.resource.create({
                data: {
                  userId,
                  phaseId: createdPhase.id,
                  title: res.title,
                  description: res.description || "",
                  url: res.url || "#",
                  type: TYPE.PHASE,
                },
              });
            }
          }

          // Phase Projects
          if (phase.projects && Array.isArray(phase.projects)) {
            for (const proj of phase.projects) {
              await prisma.project.create({
                data: {
                  userId,
                  phaseId: createdPhase.id,
                  title: proj.title,
                  description: proj.description || "",
                  steps: formatSteps(proj.steps),
                  type: TYPE.PHASE,
                },
              });
            }
          }
        }
      }

      // Global Resources
      if (
        roadmapData.globalResources &&
        Array.isArray(roadmapData.globalResources)
      ) {
        for (const res of roadmapData.globalResources) {
          await prisma.resource.create({
            data: {
              userId,
              title: res.title,
              description: res.description || "",
              url: res.url || "#",
              type: TYPE.GLOBAL,
            },
          });
        }
      }

      // Global Projects
      if (
        roadmapData.globalProjects &&
        Array.isArray(roadmapData.globalProjects)
      ) {
        for (const proj of roadmapData.globalProjects) {
          await prisma.project.create({
            data: {
              userId,
              title: proj.title,
              description: proj.description || "",
              steps: formatSteps(proj.steps),
              type: TYPE.GLOBAL,
            },
          });
        }
      }
      return this.getRoadmap(roadmap.id, userId);

    } catch (dbError: any) {
      console.error("Database Save Error:", dbError.message);
      throw new AppError(
        500,
        "Roadmap generated but failed to save to database: " + dbError.message,
      );
    }
  }

  async getMyRoadmap(userId: string) {
    const roadmap = await prisma.roadmap.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!roadmap) {
      return null; // No roadmap yet — frontend handles this gracefully
    }

    return this.getRoadmap(roadmap.id, userId);
  }

  async getRoadmap(roadmapId: string, userId: string) {
    const roadmap = await prisma.roadmap.findFirst({
      where: { id: roadmapId, userId },
      include: {
        career: true,
        phases: {
          orderBy: { phaseNumber: "asc" },
          include: {
            progress: {
              where: { userId },
            },
            resources: true,
            projects: true,
          },
        },
      },
    });

    if (!roadmap) {
      throw new AppError(404, "Roadmap not found");
    }

    // Include global resources and projects in the output
    const globalResources = await prisma.resource.findMany({
      where: { userId, type: TYPE.GLOBAL, phaseId: null },
    });

    const globalProjects = await prisma.project.findMany({
      where: { userId, type: TYPE.GLOBAL, phaseId: null },
    });

    return {
      ...roadmap,
      globalResources,
      globalProjects,
    };
  }

  async getUserRoadmaps(userId: string) {
    return prisma.roadmap.findMany({
      where: { userId },
      include: {
        career: true,
        phases: {
          orderBy: { phaseNumber: "asc" },
          include: {
            progress: {
              where: { userId },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async togglePhaseProgress(
    userId: string,
    phaseId: string,
    completed: boolean,
  ) {
    const phase = await prisma.roadmapPhase.findUnique({
      where: { id: phaseId },
    });

    if (!phase) {
      throw new AppError(404, "Roadmap phase not found");
    }

    const progress = await prisma.phaseProgress.upsert({
      where: {
        userId_phaseId: {
          userId,
          phaseId,
        },
      },
      update: {
        completed,
      },
      create: {
        userId,
        phaseId,
        completed,
      },
    });

    return progress;
  }

  async getPhaseById(phaseId: string, userId: string) {
    // Ensure the phase belongs to a roadmap owned by the user
    const phase = await prisma.roadmapPhase.findFirst({
      where: {
        id: phaseId,
        roadmap: { userId },
      },
      include: {
        resources: true,
        projects: true,
        progress: {
          where: { userId },
        },
        roadmap: {
          select: {
            id: true,
            title: true,
            career: { select: { name: true } },
          },
        },
      },
    });

    if (!phase) {
      throw new AppError(404, "Phase not found or does not belong to you");
    }

    return {
      ...phase,
      completed: phase.progress[0]?.completed === true,
    };
  }
}

export default new RoadmapService();

