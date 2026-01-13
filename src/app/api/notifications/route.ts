/**
 * @file src/app/api/notifications/route.ts
 * @description
 * 알림 API - 목록 조회 및 마일스톤 임박 체크
 *
 * 초보자 가이드:
 * 1. GET: 사용자의 알림 목록 조회 (+ 마일스톤 임박 알림 자동 생성)
 * 2. 접속 시 1회만 호출하여 리소스 절약
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

/**
 * GET /api/notifications
 * 알림 목록 조회 + 마일스톤 임박 알림 자동 생성
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checkMilestones = searchParams.get("checkMilestones") === "true";

    // 마일스톤 임박 알림 체크 (접속 시 1회)
    if (checkMilestones) {
      await checkAndCreateMilestoneNotifications(user.id);
    }

    // 알림 목록 조회 (최근 50개, 최신순)
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 읽지 않은 알림 개수
    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("알림 조회 오류:", error);
    return NextResponse.json(
      { error: "알림을 조회하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 마일스톤 임박 알림 체크 및 생성
 * D-3, D-1 기한 체크
 */
async function checkAndCreateMilestoneNotifications(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // D-3 (3일 후)
  const d3Date = new Date(today);
  d3Date.setDate(d3Date.getDate() + 3);

  // D-1 (1일 후)
  const d1Date = new Date(today);
  d1Date.setDate(d1Date.getDate() + 1);

  // 사용자가 속한 프로젝트 ID 목록 조회
  const teamMembers = await prisma.teamMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = teamMembers.map((tm) => tm.projectId);

  if (projectIds.length === 0) return;

  // D-3 마일스톤 조회
  const d3Milestones = await prisma.milestone.findMany({
    where: {
      projectId: { in: projectIds },
      endDate: {
        gte: new Date(d3Date.setHours(0, 0, 0, 0)),
        lt: new Date(d3Date.setHours(23, 59, 59, 999)),
      },
      status: { notIn: ["COMPLETED"] },
    },
    include: { project: { select: { name: true } } },
  });

  // D-1 마일스톤 조회
  const d1Milestones = await prisma.milestone.findMany({
    where: {
      projectId: { in: projectIds },
      endDate: {
        gte: new Date(d1Date.setHours(0, 0, 0, 0)),
        lt: new Date(d1Date.setHours(23, 59, 59, 999)),
      },
      status: { notIn: ["COMPLETED"] },
    },
    include: { project: { select: { name: true } } },
  });

  // 오늘 이미 생성된 마일스톤 알림 ID 조회 (중복 방지)
  const todayStart = new Date(today);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const existingNotifications = await prisma.notification.findMany({
    where: {
      userId,
      type: "MILESTONE_DUE_SOON",
      createdAt: { gte: todayStart, lte: todayEnd },
    },
    select: { relatedId: true },
  });
  const existingIds = new Set(existingNotifications.map((n) => n.relatedId));

  // D-3 알림 생성
  for (const milestone of d3Milestones) {
    if (existingIds.has(milestone.id)) continue;

    await prisma.notification.create({
      data: {
        userId,
        type: "MILESTONE_DUE_SOON",
        title: `마일스톤 D-3: ${milestone.name}`,
        message: `[${milestone.project.name}] "${milestone.name}" 마일스톤 종료일이 3일 남았습니다.`,
        link: "/dashboard/milestones",
        relatedId: milestone.id,
        projectId: milestone.projectId,
        projectName: milestone.project.name,
      },
    });
  }

  // D-1 알림 생성
  for (const milestone of d1Milestones) {
    if (existingIds.has(milestone.id)) continue;

    await prisma.notification.create({
      data: {
        userId,
        type: "MILESTONE_DUE_SOON",
        title: `마일스톤 D-1: ${milestone.name}`,
        message: `[${milestone.project.name}] "${milestone.name}" 마일스톤 종료일이 내일입니다!`,
        link: "/dashboard/milestones",
        relatedId: milestone.id,
        projectId: milestone.projectId,
        projectName: milestone.project.name,
      },
    });
  }
}
