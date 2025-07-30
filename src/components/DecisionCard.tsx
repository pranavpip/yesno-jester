import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DecisionItem {
  id: string;
  content: string;
  type: 'pro' | 'con';
}

interface DecisionCardProps {
  decision: {
    id: string;
    title: string;
    description?: string;
    items: DecisionItem[];
  };
  onUpdate: () => void;
  onDelete: () => void;
}

export function DecisionCard({ decision, onUpdate, onDelete }: DecisionCardProps) {
  const [newPro, setNewPro] = useState('');
  const [newCon, setNewCon] = useState('');
  const [isAddingPro, setIsAddingPro] = useState(false);
  const [isAddingCon, setIsAddingCon] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const pros = decision.items.filter(item => item.type === 'pro');
  const cons = decision.items.filter(item => item.type === 'con');
  const leaningToward = pros.length > cons.length ? 'Yes' : cons.length > pros.length ? 'No' : 'Neutral';

  const addItem = async (type: 'pro' | 'con', content: string) => {
    if (!content.trim()) return;

    const { error } = await supabase
      .from('decision_items')
      .insert({
        decision_id: decision.id,
        content: content.trim(),
        type,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      toast({
        title: "Error",
        description: `Failed to add ${type}`,
        variant: "destructive"
      });
    } else {
      onUpdate();
      if (type === 'pro') {
        setNewPro('');
        setIsAddingPro(false);
      } else {
        setNewCon('');
        setIsAddingCon(false);
      }
    }
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase
      .from('decision_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive"
      });
    } else {
      onUpdate();
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from('decisions')
      .delete()
      .eq('id', decision.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete decision",
        variant: "destructive"
      });
    } else {
      onDelete();
      toast({
        title: "Success",
        description: "Decision deleted successfully"
      });
    }
  };

  const generateAIProsAndCons = async () => {
    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pros-cons', {
        body: {
          title: decision.title,
          description: decision.description
        }
      });

      if (error) throw error;

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      // Add pros
      for (const pro of data.pros) {
        await supabase
          .from('decision_items')
          .insert({
            decision_id: decision.id,
            content: pro,
            type: 'pro',
            user_id: user.id
          });
      }

      // Add cons
      for (const con of data.cons) {
        await supabase
          .from('decision_items')
          .insert({
            decision_id: decision.id,
            content: con,
            type: 'con',
            user_id: user.id
          });
      }

      onUpdate();
      toast({
        title: "Success",
        description: "AI-generated pros and cons added successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI suggestions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getLeaningEmoji = () => {
    if (leaningToward === 'Yes') return '✅';
    if (leaningToward === 'No') return '❌';
    return '🤔';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{decision.title}</CardTitle>
            {decision.description && (
              <p className="text-muted-foreground mt-1">{decision.description}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <Badge variant={leaningToward === 'Yes' ? 'default' : leaningToward === 'No' ? 'destructive' : 'secondary'}>
            {getLeaningEmoji()} Leaning toward: {leaningToward}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {pros.length} pros • {cons.length} cons
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={generateAIProsAndCons}
            disabled={isGeneratingAI}
            className="ml-auto"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGeneratingAI ? 'Generating...' : 'AI Suggestions'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pros Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Pros</h3>
            </div>
            
            <div className="space-y-2">
              {pros.map((pro) => (
                <div key={pro.id} className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                  <span className="text-sm">{pro.content}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(pro.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            {isAddingPro ? (
              <div className="flex gap-2">
                <Input
                  value={newPro}
                  onChange={(e) => setNewPro(e.target.value)}
                  placeholder="Add a pro..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addItem('pro', newPro);
                    if (e.key === 'Escape') setIsAddingPro(false);
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={() => addItem('pro', newPro)}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingPro(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingPro(true)}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pro
              </Button>
            )}
          </div>

          {/* Cons Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-600">Cons</h3>
            </div>
            
            <div className="space-y-2">
              {cons.map((con) => (
                <div key={con.id} className="flex items-center justify-between bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                  <span className="text-sm">{con.content}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(con.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            {isAddingCon ? (
              <div className="flex gap-2">
                <Input
                  value={newCon}
                  onChange={(e) => setNewCon(e.target.value)}
                  placeholder="Add a con..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addItem('con', newCon);
                    if (e.key === 'Escape') setIsAddingCon(false);
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={() => addItem('con', newCon)}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingCon(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingCon(true)}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Con
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}