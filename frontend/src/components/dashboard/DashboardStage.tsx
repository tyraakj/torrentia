import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, HardDrive } from 'lucide-react'
import type { IndexedModel } from '../../lib/types'
import { useModels } from '../../hooks/use-models'
import { SettlementsTab } from './tabs/SettlementsTab'
import { SwarmMeshTab } from './tabs/SwarmMeshTab'
import { BatchedSessionsTab } from './tabs/BatchedSessionsTab'
import { PieceIntegrityTab } from './tabs/PieceIntegrityTab'

export type DashboardTabKey = 'splits' | 'mesh' | 'batch' | 'integrity'

export interface DashboardStageProps {
  models?: IndexedModel[]
}

export const DashboardStage: React.FC<DashboardStageProps> = ({ models = [] }) => {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as DashboardTabKey | null
  const activeTab: DashboardTabKey =
    tabParam && ['splits', 'mesh', 'batch', 'integrity'].includes(tabParam)
      ? tabParam
      : 'splits'

  const { data: networkModels = [] } = useModels()

  // Use creator's models if available, otherwise allow inspecting network models
  const availableModels = useMemo(() => {
    if (models && models.length > 0) return models
    return networkModels || []
  }, [models, networkModels])

  const [selectedModelId, setSelectedModelId] = useState<string>('')

  // Keep active model resolved
  const activeModel = useMemo(() => {
    if (availableModels.length === 0) return null
    if (selectedModelId) {
      const match = availableModels.find(
        (m) => m.modelId.toLowerCase() === selectedModelId.toLowerCase()
      )
      if (match) return match
    }
    return availableModels[0]
  }, [availableModels, selectedModelId])



  return (
    <div className="dashboard-sky-stage">
      <div className="dashboard-sky-grid" />

      {availableModels.length > 1 && activeModel && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem', position: 'relative', zIndex: 2 }}>
          <div className="stage-model-selector-wrap">
            <HardDrive size={13} color="#0062FF" />
            <select
              value={activeModel.modelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="stage-model-select"
            >
              {availableModels.map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.modelName || 'Model'} ({m.creatorShareBps ? Math.round(m.creatorShareBps / 100) : 70}% split)
                </option>
              ))}
            </select>
            <ChevronDown size={12} color="#78716C" />
          </div>
        </div>
      )}

      {/* Render Active Tab Pane */}
      <div className="dashboard-tab-content">
        {activeTab === 'splits' && <SettlementsTab model={activeModel || undefined} />}
        {activeTab === 'mesh' && <SwarmMeshTab model={activeModel || undefined} />}
        {activeTab === 'batch' && <BatchedSessionsTab model={activeModel || undefined} />}
        {activeTab === 'integrity' && <PieceIntegrityTab model={activeModel || undefined} />}
      </div>
    </div>
  )
}
