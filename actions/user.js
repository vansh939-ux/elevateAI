"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
  console.log("Received data:", data);

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // 1. Check if industry insight exists (Standard query, no transaction yet)
    let industryInsight = await db.industryInsight.findUnique({
      where: { industry: data.industry },
    });

    // 2. If not, generate with AI OUTSIDE the transaction
    if (!industryInsight) {
      const insights = await generateAIInsights(data.industry);

      // We create it here. If this fails, the user update won't happen.
      industryInsight = await db.industryInsight.create({
        data: {
          industry: data.industry,
          ...insights,
          nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 3. Now run the Transaction only for the quick User update
    // Since industryInsight is already handled, this will be lightning fast.
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        industry: data.industry,
        experience: parseInt(data.experience),
        bio: data.bio,
        skills: data.skills,
      },
    });

    return { success: true, updatedUser, industryInsight };
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile: " + error.message);
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });

    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error.message);
    throw new Error("Failed to check onboarding status");
  }
}