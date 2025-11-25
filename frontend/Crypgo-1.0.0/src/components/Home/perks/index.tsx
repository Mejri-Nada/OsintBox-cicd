import Image from "next/image";
// import { perksData } from "@/app/api/data"; // Removed crypto-specific import
// import { getImagePrefix } from "@/utils/utils"; // Removed if not broadly used outside this component

const Perks = () => {
  // Define new data for cybersecurity/OSINT perks
  const cyberPerksData = [
    {
      icon: "/images/icons/icon-Services.svg", // Example icon URL
      title: "Enhanced Security Posture",
      text: "Proactively identify vulnerabilities and strengthen your defenses against cyber threats. Our tools help you see what attackers see.",
      space: "", // Tailwind class for margin, if needed for spacing
    },
    {
      icon: "/images/icons/icon-Services.svg", // Example icon URL
      title: "Deep OSINT Insights",
      text: "Uncover publicly available information to gain a comprehensive understanding of digital footprints and potential risks.",
      space: "",
    },
    {
      icon: "/images/icons/icon-Services.svg", // Example icon URL
      title: "Actionable Intelligence",
      text: "Transform raw data into clear, actionable intelligence, empowering you to make informed security decisions.",
      space: "",
    },
    {
      icon: "/images/icons/icon-Services.svg", // Example icon URL
      title: "Continuous Monitoring",
      text: "Stay ahead with ongoing scans and alerts, ensuring you're always aware of changes to your digital presence.",
      space: "",
    },
    {
      icon: "/images/icons/icon-Services.svg", // Example icon URL
      title: "User-Friendly Interface",
      text: "Access complex cybersecurity tools through an intuitive and easy-to-navigate platform, designed for all skill levels.",
      space: "",
    },
    {
      icon: "/images/icons/icon-Services.svg", // Example icon URL
      title: "Unlimited Scans", // Changed from "Unlimited Access" to be more specific
      text: "Perform as many scans as you need without hidden fees or restrictive limits, empowering your extensive research.",
      space: "",
    },
  ];

  return (
    <section className="pb-28 relative" style={{paddingBottom:"10em", paddingTop:"10em", background: "transparent"}}>
      <div className="container mx-auto lg:max-w-screen-xl px-4">
        <div className="text-center">
          <p className="text-muted sm:text-28 text-18 mb-4 pb-6 relative after:content-[''] after:w-8 after:h-0.5 after:bg-primary after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2"> {/* Added -translate-x-1/2 for better centering */}
            Your <span className="text-primary">Cyber</span> Edge
          </p>
          <h2 className="text-white sm:text-40 text-30 font-medium">
            Gain Unrivaled Intelligence and <span className="text-primary">Protection</span>!
          </h2>
          <div className="mt-16 border border-border grid lg:grid-cols-3 sm:grid-cols-2 border-opacity-20 py-16 gap-10 px-20 rounded-3xl sm:bg-perk bg-dark_grey bg-opacity-35 lg:bg-bottom bg-center bg-no-repeat">
            {cyberPerksData.map((item, index) => (
              <div
                key={index}
                className="text-center flex items-center justify-end flex-col"
              >
                <div className="bg-primary bg-opacity-25 backdrop-blur-sm p-4 rounded-full w-fit">
                  <Image
                    src={item.icon}
                    alt={item.title}
                    width={44}
                    height={44}
                    unoptimized // Crucial for external image URLs with Next.js Image component
                  />
                </div>
                <h4 className={`text-white text-28 mb-4 ${item.space}`}>
                  {item.title}
                </h4>
                <div
                  className="text-muted text-opacity-60"
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Retained the gradient div if it's meant to be a background decoration */}
      <div className="bg-gradient-to-br from-tealGreen to-charcoalGray sm:w-50 w-96 sm:h-50 h-96 rounded-full sm:-bottom-80 bottom-0 blur-400 z-0 absolute sm:-left-48 opacity-60"></div>
    </section>
  );
};

export default Perks;
