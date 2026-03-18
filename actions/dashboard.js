"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export const generateAIInsights = async (industry) => {
  const prompt = `
Analyze the ${industry} industry and return insights in JSON:

{
  "salaryRanges":[
    {"role":"string","min":number,"max":number,"median":number,"location":"string"}
  ],
  "growthRate":number,
  "demandLevel":"HIGH|MEDIUM|LOW",
  "topSkills":[],
  "marketOutlook":"POSITIVE|NEUTRAL|NEGATIVE",
  "keyTrends":[],
  "recommendedSkills":[]
}

Return ONLY JSON.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text.replace(/```json|```/g, "").trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("AI Insight Generation Error:", error);
    throw new Error("Failed to generate AI insights");
  }
};

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });

  if (!user) throw new Error("User not found");

  return user.industryInsight;
}
