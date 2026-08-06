import type { Ticket } from '@/types/scenario'
import {
  getNodesOfType,
  hasEdgeBetween,
  hasPathBetween,
  isReachableFromIgw,
} from './validation/utils'

const STRUCTURAL_IDS = new Set(['internet', 'igw', 'internet-vpc', 'app-vpc', 'public-subnet', 'private-subnet'])

export const tickets: Ticket[] = [
  {
    id: 'host-website',
    message: "hey rockstar, bossman wants to host their website on the internet. I don't know what those funny words mean, but I trust you can get it done~",
    validate(nodes, edges) {
      const frontends = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs')
      return frontends.length > 0 && frontends.some(f => isReachableFromIgw(nodes, edges, f.id))
    },
    objectives: [
      {
        label: 'Frontend is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs').some(f => f.parentId === 'public-subnet')
        },
      },
      {
        label: 'IGW is connected to at least one service',
        check(_nodes, edges) {
          return edges.some(e => {
            const neighbor = e.source === 'igw' ? e.target : e.target === 'igw' ? e.source : null
            return neighbor !== null && !STRUCTURAL_IDS.has(neighbor)
          })
        },
      },
    ],
  },
  {
    id: 'backend-apis',
    message: "hey rockstar, bossman really liked your design man! but they realised it doesnt do anything. They were asking for some backend apis? whatever that means. Anyways get to it~",
    validate(nodes, edges) {
      const backends = getNodesOfType(nodes, 'backend-ec2', 'backend-ecs')
      const frontends = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs')
      if (backends.length === 0 || frontends.length === 0) return false
      return backends.some(b => frontends.some(f => hasPathBetween(nodes, edges, f.id, b.id)))
    },
    objectives: [
      {
        label: 'Frontend is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs').some(f => f.parentId === 'public-subnet')
        },
      },
      {
        label: 'Backend is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'backend-ec2', 'backend-ecs').some(b => b.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'database',
    message: "hey rockstar, bossman really likes the ehh-pee-eye that you built. Really some cutting-edge shit. Now he is wondering if he can get in on some of that database hype he has been hearing about.",
    validate(nodes, edges) {
      const rdsList = getNodesOfType(nodes, 'rds')
      const backends = getNodesOfType(nodes, 'backend-ec2', 'backend-ecs')
      if (rdsList.length === 0 || backends.length === 0) return false
      return rdsList.some(rds => backends.some(b => hasEdgeBetween(edges, rds.id, b.id)))
    },
    objectives: [
      {
        label: 'RDS is in the private subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'rds').some(r => r.parentId === 'private-subnet')
        },
      },
    ],
  },
  {
    id: 'scaling',
    trafficAnimation: { bubbleCount: 10, bubbleSpeed: 1.2 },
    message: "hey rockstar, bossman suspects that his sparkling water is going to be all the rage this black friday. people are going to be swamping the site to get some of that spicy water... would be a shame if the site crashes.",
    validate(nodes, edges) {
      const albs = getNodesOfType(nodes, 'alb')
      const asgs = getNodesOfType(nodes, 'asg')
      const computes = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs', 'backend-ec2', 'backend-ecs')
      if (albs.length === 0 || asgs.length === 0) return false
      const albToAsg = albs.some(alb => asgs.some(asg => hasEdgeBetween(edges, alb.id, asg.id)))
      if (!albToAsg) return false
      return asgs.some(asg => computes.some(c => hasEdgeBetween(edges, asg.id, c.id)))
    },
    objectives: [
      {
        label: 'ASG fans out to both a frontend and a backend node',
        check(nodes, edges) {
          const asgs = getNodesOfType(nodes, 'asg')
          const frontends = getNodesOfType(nodes, 'frontend-ec2', 'frontend-ecs')
          const backends = getNodesOfType(nodes, 'backend-ec2', 'backend-ecs')
          return asgs.some(asg =>
            frontends.some(f => hasEdgeBetween(edges, asg.id, f.id)) &&
            backends.some(b => hasEdgeBetween(edges, asg.id, b.id))
          )
        },
      },
      {
        label: 'ALB is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'alb').some(a => a.parentId === 'public-subnet')
        },
      },
    ],
  },
  {
    id: 'security',
    trafficAnimation: { bubbleColor: '#ef4444', bubbleCount: 6, bubbleSpeed: 1.6 },
    message: "hey rockstar, bossman has been doing some shady shit recently... real sussy baka... anyways i heard that a couple of hackers are targeting him so we might want to lock shit down if you know what i mean.",
    validate(nodes, edges) {
      const wafs = getNodesOfType(nodes, 'waf')
      if (wafs.length === 0) return false
      const wafReachable = wafs.some(waf => isReachableFromIgw(nodes, edges, waf.id))
      if (!wafReachable) return false
      return wafs.some(waf =>
        edges.some(e => {
          const neighbor = e.source === waf.id ? e.target : e.target === waf.id ? e.source : null
          return neighbor !== null && !STRUCTURAL_IDS.has(neighbor)
        })
      )
    },
    objectives: [
      {
        label: 'WAF is in the public subnet',
        check(nodes) {
          return getNodesOfType(nodes, 'waf').some(w => w.parentId === 'public-subnet')
        },
      },
      {
        label: 'WAF is the first service after IGW',
        check(nodes, edges) {
          return getNodesOfType(nodes, 'waf').some(w => hasEdgeBetween(edges, 'igw', w.id))
        },
      },
    ],
  },
]
