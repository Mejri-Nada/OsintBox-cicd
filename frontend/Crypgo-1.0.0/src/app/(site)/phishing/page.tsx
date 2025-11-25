import { Metadata } from "next";
import Phishing from "@/components/Home/Services/phishing/phishing";

export const metadata: Metadata = {
  title: "Phishing | Crypgo",
};

export default function Page() {
  return (
    <Phishing />
  );
}
