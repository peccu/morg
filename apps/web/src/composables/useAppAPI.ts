import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useBulkAction } from '@/composables/useBulkAction'
import type { AppAPI } from '@/plugins/types'

export function useAppAPI(): AppAPI {
  const router = useRouter()
  const { show: notify } = useToast()
  const { execute } = useBulkAction()

  return {
    notify,
    back: () => router.back(),
    openUrl: (url: string) => window.open(url, '_blank', 'noopener,noreferrer'),
    copyText: (text: string) => navigator.clipboard.writeText(text),
    gmail: {
      archive: (ids: string[]) => execute(ids, 'archive'),
      trash:   (ids: string[]) => execute(ids, 'trash'),
      markRead: (ids: string[]) => execute(ids, 'markRead'),
      addLabel: (ids: string[], labelId: string) => execute(ids, 'addLabel', labelId),
    },
  }
}
