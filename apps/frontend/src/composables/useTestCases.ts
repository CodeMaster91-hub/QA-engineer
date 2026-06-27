import { ref, computed } from 'vue';
import { api } from '@/api/client';
import type { TestCase, TestStep, Artifact } from '@/api/types';

let uidCounter = 0;
function uid() {
  return `step-${Date.now()}-${++uidCounter}`;
}

export interface StepWithUid extends TestStep {
  _uid: string;
}

export function useTestCases(artifact: Artifact | null) {
  const cases = ref<TestCase[]>(artifact?.content?.cases || []);
  const selectedIndex = ref<number | null>(null);
  const originalSnapshot = ref<string>('');
  const saving = ref(false);

  const selectedCase = computed(() =>
    selectedIndex.value !== null ? cases.value[selectedIndex.value] : null,
  );

  const isDirty = computed(() => {
    return JSON.stringify(cases.value) !== originalSnapshot.value;
  });

  function takeSnapshot() {
    originalSnapshot.value = JSON.stringify(cases.value);
  }

  function syncFromArtifact(art: Artifact | null) {
    const raw = art?.content?.cases || [];
    cases.value = raw.map((c: any) => ({
      ...c,
      automation_candidate: c.automation_candidate ?? false,
      steps: (c.steps || []).map((s: any) => ({ ...s, _uid: uid() })),
    }));
    takeSnapshot();
    selectedIndex.value = null;
  }

  function selectCase(index: number) {
    selectedIndex.value = index;
  }

  function deselectCase() {
    selectedIndex.value = null;
  }

  function updateField(field: keyof TestCase, value: any) {
    if (selectedCase.value) {
      (selectedCase.value as any)[field] = value;
    }
  }

  function addStep() {
    if (!selectedCase.value) return;
    selectedCase.value.steps.push({ action: '', expected: '', _uid: uid() });
  }

  function removeStep(index: number) {
    if (!selectedCase.value) return;
    selectedCase.value.steps.splice(index, 1);
  }

  function moveStepUp(index: number) {
    if (!selectedCase.value || index === 0) return;
    const steps = selectedCase.value.steps;
    [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
  }

  function moveStepDown(index: number) {
    if (!selectedCase.value) return;
    const steps = selectedCase.value.steps;
    if (index >= steps.length - 1) return;
    [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
  }

  function updateStepField(index: number, field: keyof TestStep, value: string) {
    if (!selectedCase.value) return;
    (selectedCase.value.steps[index] as any)[field] = value;
  }

  function addTag(tag: string) {
    if (!selectedCase.value || !tag.trim()) return;
    if (!selectedCase.value.tags.includes(tag.trim())) {
      selectedCase.value.tags.push(tag.trim());
    }
  }

  function removeTag(index: number) {
    if (!selectedCase.value) return;
    selectedCase.value.tags.splice(index, 1);
  }

  function addRequirement(reqId: string) {
    if (!selectedCase.value || !reqId.trim()) return;
    if (!selectedCase.value.requirement_ids.includes(reqId.trim())) {
      selectedCase.value.requirement_ids.push(reqId.trim());
    }
  }

  function removeRequirement(index: number) {
    if (!selectedCase.value) return;
    selectedCase.value.requirement_ids.splice(index, 1);
  }

  function addTestData(data: string) {
    if (!selectedCase.value || !data.trim()) return;
    selectedCase.value.test_data.push(data.trim());
  }

  function removeTestData(index: number) {
    if (!selectedCase.value) return;
    selectedCase.value.test_data.splice(index, 1);
  }

  function deleteCase() {
    if (selectedIndex.value === null) return;
    cases.value.splice(selectedIndex.value, 1);
    selectedIndex.value = null;
  }

  async function save(slug: string) {
    saving.value = true;
    try {
      await api.post(`/features/${slug}/artifacts`, {
        type: 'testcases',
        content: { cases: cases.value },
      });
      takeSnapshot();
    } finally {
      saving.value = false;
    }
  }

  syncFromArtifact(artifact);

  return {
    cases,
    selectedIndex,
    selectedCase,
    isDirty,
    saving,
    syncFromArtifact,
    selectCase,
    deselectCase,
    updateField,
    addStep,
    removeStep,
    moveStepUp,
    moveStepDown,
    updateStepField,
    addTag,
    removeTag,
    addRequirement,
    removeRequirement,
    addTestData,
    removeTestData,
    deleteCase,
    save,
  };
}
