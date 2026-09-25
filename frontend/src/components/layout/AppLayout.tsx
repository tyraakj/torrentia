import React, { useState } from 'react'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="wafer-outer-viewport">
      <div className="wafer-cloud-backdrop" />
      <div className="wafer-window-frame">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
        <main className="wafer-sage-canvas" id="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}
