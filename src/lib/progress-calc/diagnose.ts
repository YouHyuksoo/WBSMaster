import { differenceInBusinessDays } from "date-fns";
import { STAGE_CATEGORY_LABEL, type StageCategory } from "@/lib/stage-categories";
import { findCriticalPath } from "./critical-path";
import type {
  CategoryOverrun,
  Conflict,
  Diagnosis,
  Forecast,
  ForecastInput,
  Recommendation,
} from "./types";

export function diagnose(
  tasks: ForecastInput[],
  forecast: Map<string, Forecast>,
  conflicts: Conflict[],
  projectEndDate: Date,
  categoryOpenDates: Map<StageCategory, Date> = new Map()
): Diagnosis {
  const allEnds = [...forecast.values()].map((f) => f.forecastEnd);
  const maxEnd = allEnds.reduce((a, b) => (a > b ? a : b), new Date(0));
  const categoryOverruns = findCategoryOverruns(tasks, forecast, categoryOpenDates);

  const projectOverrunDays = maxEnd > projectEndDate ? differenceInBusinessDays(maxEnd, projectEndDate) : 0;
  const categoryOverrunDays = categoryOverruns.map((overrun) => overrun.overrunDays);
  const hasOverrun = projectOverrunDays > 0 || categoryOverruns.length > 0;
  const hasShortage = conflicts.length > 0;

  let verdict: Diagnosis["verdict"];
  if (hasOverrun && hasShortage) {
    verdict = "BOTH";
  } else if (hasOverrun) {
    verdict = "SCHEDULE_OVERRUN";
  } else if (hasShortage) {
    verdict = "RESOURCE_SHORTAGE";
  } else {
    verdict = "NORMAL";
  }

  const overrunDays = Math.max(projectOverrunDays, ...categoryOverrunDays, 0);
  const shortageMd = conflicts.reduce((sum, conflict) => sum + (conflict.overflow / 100) * 5, 0);
  const criticalPath = findCriticalPath(tasks, forecast);
  const recommendations = buildRecommendations(conflicts, criticalPath, tasks, categoryOverruns);

  return {
    verdict,
    overrunDays,
    shortageMd,
    criticalPath,
    recommendations,
    categoryOverruns,
  };
}

function buildRecommendations(
  conflicts: Conflict[],
  criticalPath: string[],
  tasks: ForecastInput[],
  categoryOverruns: CategoryOverrun[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const overrun of categoryOverruns) {
    recs.push({
      severity: "high",
      message: `${STAGE_CATEGORY_LABEL[overrun.category]} 최종 오픈일자를 ${overrun.overrunDays}영업일 초과합니다.`,
      taskId: overrun.taskIds[0],
    });
  }

  if (conflicts.length > 0 && criticalPath.length > 0) {
    const firstId = criticalPath[0];
    const first = tasks.find((task) => task.id === firstId);
    if (first) {
      recs.push({
        severity: "high",
        message: `Critical Path start task(${firstId}) needs additional assignment or split review.`,
        taskId: firstId,
      });
    }
  }

  for (const conflict of conflicts) {
    recs.push({
      severity: "high",
      message: `${conflict.userId} ${conflict.week} workload is exceeded by ${conflict.overflow}%. Adjust schedule or assignee.`,
      userId: conflict.userId,
    });
  }

  return recs;
}

function findCategoryOverruns(
  tasks: ForecastInput[],
  forecast: Map<string, Forecast>,
  categoryOpenDates: Map<StageCategory, Date>
): CategoryOverrun[] {
  const result: CategoryOverrun[] = [];

  for (const [category, openDate] of categoryOpenDates.entries()) {
    const delayedTaskIds = tasks
      .filter((task) => task.stageCategory === category)
      .filter((task) => {
        const itemForecast = forecast.get(task.id);
        return itemForecast ? itemForecast.forecastEnd > openDate : false;
      })
      .map((task) => task.id);

    if (delayedTaskIds.length === 0) continue;

    const forecastEnd = delayedTaskIds
      .map((taskId) => forecast.get(taskId)!.forecastEnd)
      .reduce((latest, current) => (latest > current ? latest : current), new Date(0));
    const overrunDays = differenceInBusinessDays(forecastEnd, openDate);

    if (overrunDays <= 0) continue;

    result.push({
      category,
      openDate,
      forecastEnd,
      overrunDays,
      taskIds: delayedTaskIds,
    });
  }

  return result.sort((a, b) => b.overrunDays - a.overrunDays);
}
