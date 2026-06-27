import { ref } from 'vue'

const statusFilter = ref('')
const typeFilter = ref('')
const reqFilter = ref('')

export function useTestCasesFilters() {
  return {
    statusFilter,
    typeFilter,
    reqFilter,
  }
}
