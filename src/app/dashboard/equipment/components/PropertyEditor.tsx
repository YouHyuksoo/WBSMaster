/**
 * @file src/app/dashboard/equipment/components/PropertyEditor.tsx
 * @description
 * 설비 동적 속성 편집기 컴포넌트
 * 사용자 정의 속성을 추가/수정/삭제합니다.
 *
 * 초보자 가이드:
 * 1. **속성 목록**: 설비의 모든 동적 속성 표시
 * 2. **속성 추가**: 새 속성 추가 폼
 * 3. **속성 삭제**: 개별 속성 삭제
 *
 * 수정 방법:
 * - 속성 타입 추가: VALUE_TYPE_CONFIG 수정
 */

"use client";

import { useState } from "react";
import { useEquipmentProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from "../hooks/useEquipmentProperties";
import { VALUE_TYPE_CONFIG } from "../types";
import { PropertyValueType } from "@/lib/api";

/** Props 타입 */
interface PropertyEditorProps {
  equipmentId: string;
}

/**
 * 동적 속성 편집기 컴포넌트
 */
export function PropertyEditor({ equipmentId }: PropertyEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState({
    key: "",
    value: "",
    valueType: "TEXT" as PropertyValueType,
    unit: "",
  });
  const [editProperty, setEditProperty] = useState({
    key: "",
    value: "",
    valueType: "TEXT" as PropertyValueType,
    unit: "",
  });

  const { data: properties = [], isLoading } = useEquipmentProperties(equipmentId);
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

  // 디버깅: equipmentId와 properties 확인
  console.log("PropertyEditor 렌더링:", { equipmentId, properties, isLoading });

  const handleAddProperty = async () => {
    if (!newProperty.key || !newProperty.value) {
      alert("속성명과 값은 필수입니다.");
      return;
    }

    try {
      console.log("속성 추가 시작:", { equipmentId, data: newProperty });
      const result = await createProperty.mutateAsync({
        equipmentId,
        data: newProperty,
      });
      console.log("속성 추가 성공:", result);

      setNewProperty({ key: "", value: "", valueType: "TEXT", unit: "" });
      setShowAddForm(false);
    } catch (error) {
      console.error("속성 추가 실패:", error);
      alert("속성 추가에 실패했습니다. 콘솔을 확인해주세요.");
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm("이 속성을 삭제하시겠습니까?")) return;

    await deleteProperty.mutateAsync({
      equipmentId,
      propertyId,
    });
  };

  const handleStartEdit = (property: any) => {
    setEditingPropertyId(property.id);
    setEditProperty({
      key: property.key,
      value: property.value,
      valueType: property.valueType,
      unit: property.unit || "",
    });
    setShowAddForm(false); // 추가 폼 닫기
  };

  const handleCancelEdit = () => {
    setEditingPropertyId(null);
    setEditProperty({
      key: "",
      value: "",
      valueType: "TEXT",
      unit: "",
    });
  };

  const handleUpdateProperty = async () => {
    if (!editingPropertyId || !editProperty.key || !editProperty.value) {
      alert("속성명과 값은 필수입니다.");
      return;
    }

    try {
      console.log("속성 수정 시작:", { equipmentId, propertyId: editingPropertyId, data: editProperty });
      await updateProperty.mutateAsync({
        equipmentId,
        propertyId: editingPropertyId,
        data: editProperty,
      });
      console.log("속성 수정 성공");
      setEditingPropertyId(null);
      setEditProperty({
        key: "",
        value: "",
        valueType: "TEXT",
        unit: "",
      });
    } catch (error) {
      console.error("속성 수정 실패:", error);
      alert("속성 수정에 실패했습니다. 콘솔을 확인해주세요.");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-text-secondary">속성 로딩 중...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text dark:text-white">동적 속성</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {showAddForm ? "close" : "add"}
          </span>
          <span>{showAddForm ? "취소" : "추가"}</span>
        </button>
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <div className="mb-4 p-3 border border-border dark:border-border-dark rounded-lg bg-surface dark:bg-background-dark">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">속성명</label>
              <input
                type="text"
                placeholder="예: 용량, 전력, 무게"
                value={newProperty.key}
                onChange={(e) => setNewProperty({ ...newProperty, key: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1 block">값</label>
              <input
                type="text"
                placeholder="예: 100, 50kW, 2ton"
                value={newProperty.value}
                onChange={(e) => setNewProperty({ ...newProperty, value: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">타입</label>
                <select
                  value={newProperty.valueType}
                  onChange={(e) =>
                    setNewProperty({ ...newProperty, valueType: e.target.value as PropertyValueType })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(VALUE_TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-text-secondary mb-1 block">단위</label>
                <input
                  type="text"
                  placeholder="예: kW, kg, ton"
                  value={newProperty.unit}
                  onChange={(e) => setNewProperty({ ...newProperty, unit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              onClick={handleAddProperty}
              disabled={createProperty.isPending}
              className="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {createProperty.isPending ? "추가 중..." : "속성 추가"}
            </button>
          </div>
        </div>
      )}

      {/* 속성 목록 */}
      {properties.length > 0 ? (
        <div className="space-y-2">
          {properties.map((prop) => (
            <div key={prop.id}>
              {editingPropertyId === prop.id ? (
                // 수정 모드
                <div className="p-3 rounded-lg bg-primary/5 border-2 border-primary">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">속성명</label>
                      <input
                        type="text"
                        value={editProperty.key}
                        onChange={(e) => setEditProperty({ ...editProperty, key: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">값</label>
                      <input
                        type="text"
                        value={editProperty.value}
                        onChange={(e) => setEditProperty({ ...editProperty, value: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-text-secondary mb-1 block">타입</label>
                        <select
                          value={editProperty.valueType}
                          onChange={(e) =>
                            setEditProperty({ ...editProperty, valueType: e.target.value as PropertyValueType })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {Object.entries(VALUE_TYPE_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-text-secondary mb-1 block">단위</label>
                        <input
                          type="text"
                          value={editProperty.unit}
                          onChange={(e) => setEditProperty({ ...editProperty, unit: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-4 py-2 bg-surface dark:bg-background-dark text-text dark:text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleUpdateProperty}
                        disabled={updateProperty.isPending}
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {updateProperty.isPending ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // 일반 모드
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark hover:border-primary/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: 14 }}>
                        {VALUE_TYPE_CONFIG[prop.valueType]?.icon || "text_fields"}
                      </span>
                      <p className="text-sm font-medium text-text dark:text-white">{prop.key}</p>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {prop.value}
                      {prop.unit && <span className="ml-1">{prop.unit}</span>}
                      <span className="ml-2 text-[10px] text-text-secondary/70">
                        ({VALUE_TYPE_CONFIG[prop.valueType]?.label || prop.valueType})
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEdit(prop)}
                      className="text-primary hover:text-primary-hover transition-colors"
                      title="수정"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(prop.id)}
                      disabled={deleteProperty.isPending}
                      className="text-error hover:text-error/80 transition-colors disabled:opacity-50"
                      title="삭제"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-border dark:border-border-dark rounded-lg">
          <span className="material-symbols-outlined text-text-secondary mb-2" style={{ fontSize: 32 }}>
            inventory_2
          </span>
          <p className="text-sm text-text-secondary">등록된 속성이 없습니다.</p>
          <p className="text-xs text-text-secondary mt-1">
            우측 상단 "추가" 버튼을 눌러 속성을 추가하세요.
          </p>
        </div>
      )}
    </div>
  );
}
