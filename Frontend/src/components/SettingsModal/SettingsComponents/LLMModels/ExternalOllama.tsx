import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useUser } from "@/context/useUser";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
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
  const [selectedExternalOllama, setSelectedExternalOllama] =
    useState<ExternalOllama | null>(null);
  const [externalOllamaEndpoint, setExternalOllamaEndpoint] = useState("");
  const [externalOllamaApiKey, setExternalOllamaApiKey] = useState("");
  const [externalOllamaModel, setExternalOllamaModel] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (externalOllamaName === "") {
      toast({
        title: "Error",
        description: "Please enter a name",
      });
      return;
    }
    if (externalOllamaEndpoint === "") {
      toast({
        title: "Error",
        description: "Please enter a endpoint",
      });
      return;
    }
    if (externalOllamaModel === "") {
      toast({
        title: "Error",
        description: "Please enter a model",
      });
      return;
    }
    try {
      if (!activeUser) return;
      const ollamaId = await window.electron.addExternalOllama(
        activeUser.id,
        externalOllamaName,
        externalOllamaEndpoint,
        externalOllamaApiKey,
        externalOllamaModel
      );
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
      setSelectedExternalOllama(null);
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

  const handleSelectedExternalOllama = (value: string) => {
    const selectedModel = externalOllama.find((model) => model.name === value);
    setSelectedExternalOllama(selectedModel || null);
    setExternalOllamaEndpoint(selectedModel?.endpoint || "");
    setExternalOllamaApiKey(selectedModel?.api_key || "");
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
              <CardContent className="space-y-2 gap-2">
                <div className="grid grid-cols-4 items-center gap-2 justify-between">
                  <Label className="text-xs font-medium">
                    {selectedExternalOllama
                      ? "Selected Endpoint"
                      : "Select a Endpoint"}
                  </Label>
                  <Select
                    onValueChange={handleSelectedExternalOllama}
                    value={selectedExternalOllama?.name}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a endpoint" />
                    </SelectTrigger>
                    <SelectContent>
                      {externalOllama.map((model) => (
                        <SelectItem key={model.id} value={model.name}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedExternalOllama && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 items-center gap-2 justify-between">
                      <Label htmlFor="name" className="text-xs font-medium">
                        Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter a a new name"
                        value={externalOllamaName}
                        onChange={(e) => setExternalOllamaName(e.target.value)}
                        className="input-field col-span-3 bg-background"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-2 justify-between">
                      <Label
                        htmlFor="model-name"
                        className="text-xs font-medium"
                      >
                        Model Name
                      </Label>
                      <Input
                        id="model-name"
                        value={externalOllamaModel}
                        placeholder="Enter the model name"
                        onChange={(e) => setExternalOllamaModel(e.target.value)}
                        className="input-field col-span-3 bg-background"
                      />
                    </div>
                  </div>
                )}
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
                  id="model-name"
                  type="text"
                  placeholder="Enter the model name"
                  value={externalOllamaModel}
                  onChange={(e) => setExternalOllamaModel(e.target.value)}
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
