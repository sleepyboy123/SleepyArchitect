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
import type { ServiceNodeData, SubnetNodeData } from '@/types/game'
import { INITIAL_NODES, INITIAL_EDGES } from '@/types/game'

interface GameStore {
  nodes: Node[]
  edges: Edge[]
  addServiceNode: (node: Node) => void
  removeNode: (nodeId: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  splitEdge: (edgeId: string, newNodeId: string) => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,

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

  onNodesChange: (changes) => {
    set(state => ({ nodes: applyNodeChanges(changes, state.nodes) }))
  },

  onEdgesChange: (changes) => {
    set(state => ({ edges: applyEdgeChanges(changes, state.edges) }))
  },

  onConnect: (connection) => {
    set(state => ({
      edges: addEdge({ ...connection, type: 'default' }, state.edges),
    }))
  },

  splitEdge: (edgeId, newNodeId) => {
    set(state => {
      const edge = state.edges.find(e => e.id === edgeId)
      if (!edge) return state
      const remaining = state.edges.filter(e => e.id !== edgeId)
      const newEdges: Edge[] = [
        { id: `${edge.source}-to-${newNodeId}`, source: edge.source, target: newNodeId, type: 'default' },
        { id: `${newNodeId}-to-${edge.target}`, source: newNodeId, target: edge.target, type: 'default' },
      ]
      return { edges: [...remaining, ...newEdges] }
    })
  },
}))
