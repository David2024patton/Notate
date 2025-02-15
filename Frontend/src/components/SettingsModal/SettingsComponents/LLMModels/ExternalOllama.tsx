import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useUser } from "@/context/useUser";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export default function ExternalOllama() {
  const { activeUser, fetchExternalOllama, externalOllama } = useUser();
  const [externalOllamaName, setExternalOllamaName] = useState("");
  const [externalOllamaEndpoint, setExternalOllamaEndpoint] = useState("");
  const [externalOllamaApiKey, setExternalOllamaApiKey] = useState("");
  const [externalOllamaModel, setExternalOllamaModel] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!activeUser) return;
      const ollamaId = await window.electron.addExternalOllama(
        activeUser.id,
        externalOllamaName,
        externalOllamaEndpoint,
        externalOllamaApiKey,
        externalOllamaModel
      );
      console.log(ollamaId);
      const updateSettings = await window.electron.updateUserSettings({
        userId: activeUser.id,
        provider: "ollama external",
        baseUrl: externalOllamaEndpoint,
        model: externalOllamaModel,
        isLocal: false,
        selectedExternalOllamaId: ollamaId.id,
      });
      console.log(updateSettings);
      toast({
        title: "Custom provider added",
        description: "Your custom provider has been added",
      });
      setExternalOllamaName("");
      setExternalOllamaEndpoint("");
      setExternalOllamaApiKey("");
      setExternalOllamaModel("");
      fetchExternalOllama();
    } catch (error) {
      toast({
        title: "Error",
        description:
          "An error occurred while adding your custom provider. Please try again." +
          error,
      });
    }
  };

  return (
    <div className="space-y-2">
      {externalOllama.length > 0 ? (
        <Tabs className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add-model">Add Model</TabsTrigger>
            <TabsTrigger value="add-endpoint">Add Endpoint</TabsTrigger>
          </TabsList>
          <TabsContent value="add-model">
            <Card className="py-2">
              <CardContent className="space-y-2">
                <Select onValueChange={setExternalOllamaModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {externalOllama.map((model) => (
                      <SelectItem key={model.id} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSubmit} className="w-full">
                  Save changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="add-endpoint">
            <Card>
              <CardHeader>
                <CardTitle>Add Endpoint</CardTitle>
                <CardDescription>
                  Add a new endpoint to your external ollama provider.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  id="Name"
                  type="text"
                  placeholder="Enter a name for your ollama external provider"
                  value={externalOllamaName}
                  onChange={(e) => setExternalOllamaName(e.target.value)}
                  className="input-field"
                />
                <Input
                  id="endpoint"
                  type="text"
                  placeholder="Endpoint (e.g. http://localhost:11434/api/chat)"
                  value={externalOllamaEndpoint}
                  onChange={(e) => setExternalOllamaEndpoint(e.target.value)}
                  className="input-field"
                />

                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key (optional)"
                  value={externalOllamaApiKey}
                  onChange={(e) => setExternalOllamaApiKey(e.target.value)}
                  className="input-field"
                />
              </CardContent>
              <CardFooter>
                <Button onClick={handleSubmit}>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <Input
            id="Name"
            type="text"
            placeholder="Enter a name for your ollama external provider"
            value={externalOllamaName}
            onChange={(e) => setExternalOllamaName(e.target.value)}
            className="input-field"
          />
          <Input
            id="endpoint"
            type="text"
            placeholder="Endpoint (e.g. http://localhost:11434/api/chat)"
            value={externalOllamaEndpoint}
            onChange={(e) => setExternalOllamaEndpoint(e.target.value)}
            className="input-field"
          />

          <Input
            id="api-key"
            type="password"
            placeholder="Enter your API key (optional)"
            value={externalOllamaApiKey}
            onChange={(e) => setExternalOllamaApiKey(e.target.value)}
            className="input-field"
          />
        </>
      )}
    </div>
  );
}
