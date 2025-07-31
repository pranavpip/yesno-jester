import { useState } from 'react';
import { Search, ExternalLink, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WebSearchResultsProps {
  decisionTitle: string;
  className?: string;
}

interface SearchResult {
  content: string;
  related_questions: string[];
}

export const WebSearchResults = ({ decisionTitle, className }: WebSearchResultsProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('web-search', {
        body: { query: query.trim() }
      });

      if (error) {
        console.error('Search error:', error);
        toast({
          title: "Search Failed",
          description: "Unable to search web results. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setResults(data);
      toast({
        title: "Search Complete",
        description: "Found relevant web information for your decision.",
      });

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search web results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchDecision = () => {
    setQuery(`${decisionTitle} pros cons considerations`);
    setTimeout(handleSearch, 100);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Web Research
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search for information about your decision..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>
        
        <Button 
          variant="outline" 
          onClick={searchDecision}
          disabled={isLoading}
          className="w-full"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          Research this decision
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Search Results</h4>
              <div className="prose prose-sm max-w-none text-foreground">
                {results.content.split('\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  )
                ))}
              </div>
            </div>

            {results.related_questions && results.related_questions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Related Questions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.related_questions.map((question, index) => (
                    <Badge 
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                      onClick={() => {
                        setQuery(question);
                        setTimeout(handleSearch, 100);
                      }}
                    >
                      {question}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};