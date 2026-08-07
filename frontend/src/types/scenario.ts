import type { Node, Edge } from '@xyflow/react'
import type { TrafficAnimationConfig, SidebarItem } from '@/types/game'

export type { TrafficAnimationConfig }

export interface Objective {
  label: string
  check: (nodes: Node[], edges: Edge[]) => boolean
}

export interface Ticket {
  id: string
  message: string
  validate: (nodes: Node[], edges: Edge[]) => boolean
  objectives: Objective[]
  trafficAnimation?: TrafficAnimationConfig
}

export interface ScenarioDefinition {
  id: string
  title: string
  description: string
  tickets: Ticket[]
  answerNodes: Node[]
  answerEdges: Edge[]
  sidebarItems: SidebarItem[]
}

export interface ValidationResult {
  passed: boolean
  objectives: { label: string; met: boolean }[]
}
