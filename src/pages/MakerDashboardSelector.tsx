import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Box, Flame, Sparkles, Scissors, FileBox, Upload } from "lucide-react";
import { MotionWrapper } from "@/components/ui/MotionWrapper";

const MakerDashboardSelector = () => {
  const options = [
    { title: "Manage Printers", desc: "View and edit your machines", icon: Box, link: "/printers" },
    { title: "Upload Files", desc: "Add new print jobs", icon: Upload, link: "/upload" },
    { title: "View Creations", desc: "Check your file history", icon: FileBox, link: "/dashboard" },
  ];

  return (
    <div className="container py-12">
      <h2 className="font-display text-3xl font-semibold mb-8">What would you like to do?</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {options.map((opt) => (
          <MotionWrapper key={opt.title}>
            <Link to={opt.link}>
              <Card className="hover:border-primary transition-all">
                <CardHeader>
                  <opt.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>{opt.title}</CardTitle>
                  <CardDescription>{opt.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </MotionWrapper>
        ))}
      </div>
    </div>
  );
};

export default MakerDashboardSelector;
