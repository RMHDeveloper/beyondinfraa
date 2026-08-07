import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full py-24">
      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" strokeWidth={2} />
    </div>
  );
}
