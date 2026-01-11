/**
 * @file src/app/api/process-verification/items/next-code/route.ts
 * @description
 * 다음 관리코드를 자동 생성하는 API 라우트입니다.
 * 카테고리별로 기존 항목의 관리코드 패턴을 분석하여 다음 번호를 생성합니다.
 *
 * 초보자 가이드:
 * GET /api/process-verification/items/next-code?categoryId=xxx
 * - categoryId: 카테고리 ID (필수)
 * - 반환값: { nextCode: "MATERIAL-005", pattern: "MATERIAL-###" }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 관리코드에서 숫자 부분 추출
 * 예: "MATERIAL-005" -> 5, "MAT-123" -> 123, "A-1-2-3" -> 3 (마지막 숫자)
 */
function extractNumber(code: string): number {
  // 마지막에 나오는 숫자 그룹 추출
  const matches = code.match(/(\d+)(?!.*\d)/);
  return matches ? parseInt(matches[1], 10) : 0;
}

/**
 * 관리코드의 접두사 패턴 추출
 * 예: "MATERIAL-005" -> "MATERIAL-", "MAT123" -> "MAT"
 */
function extractPrefix(code: string): string {
  // 마지막 숫자 그룹 이전까지 추출
  const match = code.match(/^(.+?)(\d+)(?!.*\d)/);
  return match ? match[1] : code;
}

/**
 * 숫자를 지정된 자릿수로 패딩
 * 예: 5, 3 -> "005"
 */
function padNumber(num: number, digits: number): string {
  return String(num).padStart(digits, "0");
}

/**
 * 다음 관리코드 조회
 * GET /api/process-verification/items/next-code
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        { error: "카테고리 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 카테고리 정보 조회
    const category = await prisma.processVerificationCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "카테고리를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 해당 카테고리의 모든 항목 관리코드 조회
    const items = await prisma.processVerificationItem.findMany({
      where: { categoryId },
      select: { managementCode: true },
      orderBy: { managementCode: "desc" },
    });

    let nextCode: string;
    let pattern: string;

    if (items.length === 0) {
      // 기존 항목이 없는 경우: 카테고리 코드-001 형식으로 시작
      nextCode = `${category.code}-001`;
      pattern = `${category.code}-###`;
    } else {
      // 기존 항목이 있는 경우: 패턴 분석 및 다음 번호 생성
      const codes = items.map((item) => item.managementCode);

      // 가장 큰 숫자 찾기
      let maxNumber = 0;
      let samplePrefix = "";
      let digitLength = 3; // 기본 3자리

      for (const code of codes) {
        const num = extractNumber(code);
        const prefix = extractPrefix(code);

        if (num > maxNumber) {
          maxNumber = num;
          samplePrefix = prefix;
          // 원본 코드에서 숫자 부분의 자릿수 확인
          const numMatch = code.match(/(\d+)(?!.*\d)/);
          if (numMatch) {
            digitLength = Math.max(digitLength, numMatch[1].length);
          }
        }
      }

      // 접두사가 없으면 카테고리 코드 사용
      if (!samplePrefix) {
        samplePrefix = `${category.code}-`;
      }

      const nextNumber = maxNumber + 1;
      nextCode = `${samplePrefix}${padNumber(nextNumber, digitLength)}`;
      pattern = `${samplePrefix}${"#".repeat(digitLength)}`;
    }

    // 중복 체크 (만약 해당 코드가 이미 존재하면 다음 번호로)
    let duplicateCheck = await prisma.processVerificationItem.findFirst({
      where: { managementCode: nextCode },
    });

    // 중복인 경우 다음 사용 가능한 코드 찾기
    while (duplicateCheck) {
      const num = extractNumber(nextCode);
      const prefix = extractPrefix(nextCode);
      const digitMatch = nextCode.match(/(\d+)(?!.*\d)/);
      const digitLength = digitMatch ? digitMatch[1].length : 3;
      nextCode = `${prefix}${padNumber(num + 1, digitLength)}`;

      duplicateCheck = await prisma.processVerificationItem.findFirst({
        where: { managementCode: nextCode },
      });
    }

    return NextResponse.json({
      nextCode,
      pattern,
      categoryCode: category.code,
      existingCount: items.length,
    });
  } catch (error) {
    console.error("다음 관리코드 조회 실패:", error);
    return NextResponse.json(
      { error: "다음 관리코드를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
