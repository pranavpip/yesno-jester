import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { DecisionCard } from '@/components/DecisionCard';
import { WebSearchResults } from '@/components/WebSearchResults';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, LogOut, Brain } from 'lucide-react';

interface Decision {
  id: string;
  title: string;
  description?: string;
  items: {
    id: string;
    content: string;
    type: 'pro' | 'con';
  }[];
}

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDecisions();
    }
  }, [user]);

  const fetchDecisions = async () => {
    const { data: decisionsData, error: decisionsError } = await supabase
      .from('decisions')
      .select('*')
      .order('created_at', { ascending: false });

    if (decisionsError) {
      toast({
        title: "Error",
        description: "Failed to fetch decisions",
        variant: "destructive"
      });
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('decision_items')
      .select('*');

    if (itemsError) {
      toast({
        title: "Error",
        description: "Failed to fetch decision items",
        variant: "destructive"
      });
      return;
    }

    const decisionsWithItems = decisionsData.map(decision => ({
      ...decision,
      items: itemsData
        .filter(item => item.decision_id === decision.id)
        .map(item => ({
          id: item.id,
          content: item.content,
          type: item.type as 'pro' | 'con'
        }))
    }));

    setDecisions(decisionsWithItems);
  };

  const handleCreateDecision = async () => {
    if (!newTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a decision title",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    const { error } = await supabase
      .from('decisions')
      .insert({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        user_id: user?.id
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create decision",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Decision created successfully!"
      });
      setNewTitle('');
      setNewDescription('');
      setIsCreateOpen(false);
      fetchDecisions();
    }
    setIsCreating(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Yes/No Decision Helper</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.user_metadata?.display_name || user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">My Decisions</h2>
            <p className="text-muted-foreground mt-1">
              Create pros and cons lists to help make better decisions
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Decision
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Decision</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Decision Title</Label>
                  <Input
                    id="title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Should I move to a new city?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Add any additional context..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDecision} disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Decision'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {decisions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="mb-2">No decisions yet</CardTitle>
              <p className="text-muted-foreground mb-4">
                Create your first decision to start making better choices with pros and cons lists
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Decision
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <WebSearchResults 
              decisionTitle="general decision making"
              className="mb-6"
            />
            {decisions.map((decision) => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                onUpdate={fetchDecisions}
                onDelete={fetchDecisions}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
