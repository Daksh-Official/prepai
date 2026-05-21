// data.ts
export interface TeamMember {
    id: number;
    name: string;
    image: string;
    roles: string[]; // Changed role to roles (array of strings)
    linkedin: string;
    instagram: string;
    email: string;
  }
  
  const teamData: TeamMember[] = [
    {
      id: 1,
      name: "Daksh Gupta",
      image: "/images/daksh.jpeg",
      roles: ["Full Stack Developer", "UI/UX Designer"], 
      linkedin: "https://www.linkedin.com/in/daksh-gupta-6a4816262?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
      instagram: "",
      email: "daksh.official9705@gmail.com",
    },
    {
      id: 2,
      name: "Kartik Kumar",
      image: "/images/kartik.jpeg",
      roles: ["Full Stack Developer", "AI Engineer"], 
      linkedin: "https://linkedin.com/in/kartikkumar925800",
      instagram: "",
      email: "K.kartikkumar8527@gmail.com",
    },
  ];
  
  export default teamData;
