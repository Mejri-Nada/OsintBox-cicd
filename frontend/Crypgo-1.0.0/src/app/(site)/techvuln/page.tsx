import { Metadata } from "next";
import TechVuln from "@/components/Home/Services/techvuln/techvuln";

export const metadata: Metadata = {
  title: "TechnologyVunerability | Crypgo",
};

export default function Page() {
  return (
    <TechVuln />
  );
}
