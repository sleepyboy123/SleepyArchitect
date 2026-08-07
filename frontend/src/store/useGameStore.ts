import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import type { ServiceNodeData, SubnetNodeData, SidebarItem } from '@/types/game'
import { INITIAL_NODES, INITIAL_EDGES, getSlotPosition } from '@/types/game'
import type { ScenarioDefinition } from '@/types/scenario'

interface GameStore {
  nodes: Node[]
  edges: Edge[]
  sidebarItems: SidebarItem[]
  currentScenarioId: string | null
  currentTicketIndex: number
  addServiceNode: (node: Node) => void
  removeNode: (nodeId: string) => void
  moveNodeToSlot: (nodeId: string, newSlotIndex: number) => void
  clearBoard: () => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  splitEdge: (edgeId: string, newNodeId: string) => void
  startScenario: (scenarioId: string) => void
  setScenario: (scenario: ScenarioDefinition) => void
  advanceTicket: () => void
}

export const useGameStore = create<GameStore>()((set, _get) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  sidebarItems: [],
  currentScenarioId: null,
  currentTicketIndex: 0,

  addServiceNode: (node) => {
    set(state => {
      const slotIndex = (node.data as ServiceNodeData).slotIndex
      const subnetId = node.parentId

      const updatedNodes = slotIndex !== -1 && subnetId
        ? state.nodes.map(n => {
            if (n.id === subnetId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  occupiedSlots: {
                    ...(n.data as SubnetNodeData).occupiedSlots,
                    [slotIndex]: node.id,
                  },
                },
              }
            }
            return n
          })
        : state.nodes

      return { nodes: [...updatedNodes, node] }
    })
  },

  removeNode: (nodeId) => {
    set(state => {
      const removedNode = state.nodes.find(n => n.id === nodeId)
      const subnetId = removedNode?.parentId
      const slotIndex = removedNode ? (removedNode.data as ServiceNodeData).slotIndex : undefined

      const updatedNodes = state.nodes
        .filter(n => n.id !== nodeId)
        .map(n => {
          if (n.id === subnetId && slotIndex !== undefined && slotIndex !== -1) {
            const slots = { ...(n.data as SubnetNodeData).occupiedSlots }
            delete slots[slotIndex]
            return { ...n, data: { ...n.data, occupiedSlots: slots } }
          }
          return n
        })

      const updatedEdges = state.edges.filter(
        e => e.source !== nodeId && e.target !== nodeId
      )
      return { nodes: updatedNodes, edges: updatedEdges }
    })
  },

  moveNodeToSlot: (nodeId, newSlotIndex) => {
    set(state => {
      const node = state.nodes.find(n => n.id === nodeId)
      if (!node) return state
      const subnetId = node.parentId
      const oldSlotIndex = (node.data as ServiceNodeData).slotIndex
      const newSlotPos = getSlotPosition(newSlotIndex)
      const updatedNodes = state.nodes.map(n => {
        if (n.id === nodeId) {
          return { ...n, position: newSlotPos, data: { ...n.data, slotIndex: newSlotIndex } }
        }
        if (n.id === subnetId && oldSlotIndex !== newSlotIndex) {
          const slots = { ...(n.data as SubnetNodeData).occupiedSlots }
          delete slots[oldSlotIndex]
          slots[newSlotIndex] = nodeId
          return { ...n, data: { ...n.data, occupiedSlots: slots } }
        }
        return n
      })
      return { nodes: updatedNodes }
    })
  },

  onNodesChange: (changes) => {
    set(state => ({ nodes: applyNodeChanges(changes, state.nodes) }))
  },

  onEdgesChange: (changes) => {
    set(state => ({ edges: applyEdgeChanges(changes, state.edges) }))
  },

  onConnect: (connection) => {
    set(state => ({
      edges: addEdge({ ...connection, type: 'trafficEdge' }, state.edges),
    }))
  },

  clearBoard: () => set({ nodes: INITIAL_NODES, edges: INITIAL_EDGES }),

  startScenario: (scenarioId) => set({
    currentScenarioId: scenarioId,
    currentTicketIndex: 0,
    nodes: INITIAL_NODES,
    edges: INITIAL_EDGES,
  }),

  setScenario: (scenario) => set({ sidebarItems: scenario.sidebarItems }),

  advanceTicket: () => set(state => ({
    currentTicketIndex: state.currentTicketIndex + 1,
  })),

  splitEdge: (edgeId, newNodeId) => {
    set(state => {
      const edge = state.edges.find(e => e.id === edgeId)
      if (!edge) return state
      const remaining = state.edges.filter(e => e.id !== edgeId)
      const newEdges: Edge[] = [
        { id: `${edge.source}-to-${newNodeId}`, source: edge.source, target: newNodeId, type: 'trafficEdge' },
        { id: `${newNodeId}-to-${edge.target}`, source: newNodeId, target: edge.target, type: 'trafficEdge' },
      ]
      return { edges: [...remaining, ...newEdges] }
    })
  },
}))
