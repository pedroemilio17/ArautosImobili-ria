import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFlow, type FlowType } from "@/lib/flow-context";

export function FlowSwitcher() {
  const { activeFlow, setActiveFlow } = useFlow();

  const handleValueChange = (value: string) => {
    setActiveFlow(value as FlowType);
  };

  const getFlowBadge = () => {
    if (activeFlow === "eco") {
      return <Badge className="bg-amber-500 hover:bg-amber-600 ml-2">ECO</Badge>;
    }
    if (activeFlow === "con") {
      return <Badge className="bg-blue-500 hover:bg-blue-600 ml-2">CON</Badge>;
    }
    return <Badge variant="outline" className="ml-2">Todos</Badge>;
  };

  return (
    <div className="flex items-center w-full mb-4">
      <Select value={activeFlow} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center">
            <SelectValue placeholder="Selecione o Flow" />
            {getFlowBadge()}
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos</SelectItem>
          <SelectItem value="eco">Econômico (ECO)</SelectItem>
          <SelectItem value="con">Concept (CON)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
