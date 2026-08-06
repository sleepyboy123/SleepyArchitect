import { Sidebar } from './Sidebar'
import { FlowCanvas } from './canvas/FlowCanvas'
import { useGameStore } from '@/store/useGameStore'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

export function GameBoard() {
  const clearBoard = useGameStore(s => s.clearBoard)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 relative">
        <FlowCanvas />
        <div className="absolute top-4 right-4 z-10">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 shadow-sm">
                <Trash2 className="w-3.5 h-3.5" />
                Clear Board
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear the board?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all services and connections from the canvas.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearBoard}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear Board
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
