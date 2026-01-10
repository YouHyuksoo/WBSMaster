/**
 * @file src/app/dashboard/process-verification/components/ItemTable.tsx
 * @description
 * 공정검증 항목 테이블 컴포넌트입니다.
 * 검증 항목을 테이블 형태로 표시하고 편집 기능을 제공합니다.
 */

"use client";

import { useState } from "react";
import {
  ProcessVerificationItem,
  VerificationStatus,
  verificationStatusConfig,
} from "../types";

interface ItemTableProps {
  items: ProcessVerificationItem[];
  isLoading?: boolean;
  onUpdateItem: (id: string, data: Partial<ProcessVerificationItem>) => Promise<void>;
}

/**
 * 항목 테이블 컴포넌트
 */
export default function ItemTable({
  items,
  isLoading,
  onUpdateItem,
}: ItemTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 적용 여부 토글
  const handleToggleApplied = async (item: ProcessVerificationItem) => {
    await onUpdateItem(item.id, { isApplied: !item.isApplied });
  };

  // 상태 변경
  const handleStatusChange = async (
    item: ProcessVerificationItem,
    status: VerificationStatus
  ) => {
    await onUpdateItem(item.id, { status });
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-10 bg-slate-200 rounded mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-slate-100 rounded mb-2" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <svg
          className="w-16 h-16 mb-4 text-slate-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p>항목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 font-semibold text-slate-700 w-20">
              적용
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 w-24">
              관리코드
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 w-32">
              구분
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">
              관리 영역
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">
              세부 관리 항목
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 w-40">
              MES/IT 매핑
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 w-24">
              기존MES
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 w-28">
              상태
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const statusConfig = verificationStatusConfig[item.status];
            const isExpanded = expandedId === item.id;

            return (
              <>
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                    isExpanded ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {/* 적용 체크박스 */}
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={item.isApplied}
                      onChange={() => handleToggleApplied(item)}
                      className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
                    />
                  </td>

                  {/* 관리코드 */}
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">
                    {item.managementCode}
                  </td>

                  {/* 구분 */}
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                  </td>

                  {/* 관리 영역 */}
                  <td className="py-3 px-4 text-slate-700">
                    {item.managementArea}
                  </td>

                  {/* 세부 관리 항목 */}
                  <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                    {item.detailItem}
                  </td>

                  {/* MES/IT 매핑 */}
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {item.mesMapping || "-"}
                  </td>

                  {/* 기존MES */}
                  <td className="py-3 px-4">
                    {item.existingMes ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Y
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        N
                      </span>
                    )}
                  </td>

                  {/* 상태 */}
                  <td
                    className="py-3 px-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingId === item.id ? (
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(
                            item,
                            e.target.value as VerificationStatus
                          )
                        }
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        className="text-xs border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(verificationStatusConfig).map(
                          ([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          )
                        )}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(item.id)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} hover:opacity-80 transition-opacity`}
                      >
                        {statusConfig.label}
                      </button>
                    )}
                  </td>
                </tr>

                {/* 확장 상세 */}
                {isExpanded && (
                  <tr key={`${item.id}-detail`} className="bg-blue-50">
                    <td colSpan={8} className="py-4 px-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-2">
                            세부 검증 내용
                          </h4>
                          <p className="text-slate-600 whitespace-pre-wrap">
                            {item.verificationDetail || "내용 없음"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-2">
                            수용 여부
                          </h4>
                          <p className="text-slate-600">
                            {item.acceptanceStatus || "미정"}
                          </p>
                          {item.customerRequest && (
                            <div className="mt-2">
                              <h4 className="font-semibold text-slate-700 mb-1">
                                고객 요청
                              </h4>
                              <p className="text-slate-600">
                                {item.customerRequest}
                              </p>
                            </div>
                          )}
                          {item.remarks && (
                            <div className="mt-2">
                              <h4 className="font-semibold text-slate-700 mb-1">
                                비고
                              </h4>
                              <p className="text-slate-600">{item.remarks}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
