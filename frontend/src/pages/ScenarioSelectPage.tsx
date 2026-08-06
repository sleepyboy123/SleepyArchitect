import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { ALL_SCENARIOS } from '@/scenarios'

export function ScenarioSelectPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">AWS Architect</h1>
      <p className="text-muted-foreground mb-12">Choose a scenario to begin</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
        {Object.values(ALL_SCENARIOS).map(scenario => (
          <Card key={scenario.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{scenario.title}</CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto pt-4">
              <Button className="w-full" onClick={() => navigate(`/play/${scenario.id}`)}>
                Play
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
