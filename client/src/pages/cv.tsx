import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, X, FileText, User, Briefcase, GraduationCap, Award, Languages, Phone, Mail, MapPin, Calendar, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useRoute } from "wouter";

interface CVData {
  fullName: string;
  accountType: 'business' | 'creator' | 'government';
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Array<{
    id: string;
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    year: string;
    description: string;
  }>;
  skills: string[];
  languages: string[];
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string;
    link: string;
  }>;
}

export default function CVPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/cv/:userId");
  
  const isViewingOtherUser = !!params?.userId;
  const targetUserId = params?.userId || user?.id;
  
  const [cvData, setCvData] = useState<CVData>({
    fullName: '',
    accountType: 'creator',
    email: '',
    phone: '',
    location: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    achievements: [],
    projects: []
  });
  
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  // Fetch CV data
  const { data: savedCV, isLoading } = useQuery({
    queryKey: isViewingOtherUser ? ['/api/cv', targetUserId] : ['/api/cv'],
    queryFn: async () => {
      if (isViewingOtherUser) {
        const response = await apiRequest('GET', `/api/users/${targetUserId}/cv`);
        return response.json();
      } else {
        const response = await apiRequest('GET', '/api/cv');
        return response.json();
      }
    },
    enabled: !!user && !!targetUserId,
  });

  // Save CV mutation
  const saveCVMutation = useMutation({
    mutationFn: async (data: CVData) => {
      const response = await apiRequest('POST', '/api/cv', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cv'] });
      toast({
        title: "CV Saved",
        description: "Your CV has been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save CV",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (savedCV && typeof savedCV === 'object') {
      setCvData(savedCV as CVData);
    } else if (user) {
      setCvData(prev => ({
        ...prev,
        fullName: user.displayName || user.username || '',
        email: ''
      }));
    }
  }, [savedCV, user]);

  const addExperience = () => {
    setCvData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        id: Date.now().toString(),
        company: '',
        position: '',
        duration: '',
        description: ''
      }]
    }));
  };

  const updateExperience = (id: string, field: string, value: string) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => 
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExperience = (id: string) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  };

  const addEducation = () => {
    setCvData(prev => ({
      ...prev,
      education: [...prev.education, {
        id: Date.now().toString(),
        institution: '',
        degree: '',
        year: '',
        description: ''
      }]
    }));
  };

  const updateEducation = (id: string, field: string, value: string) => {
    setCvData(prev => ({
      ...prev,
      education: prev.education.map(edu => 
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (id: string) => {
    setCvData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setCvData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setCvData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addLanguage = () => {
    if (newLanguage.trim()) {
      setCvData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  const removeLanguage = (language: string) => {
    setCvData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language)
    }));
  };

  const addAchievement = () => {
    setCvData(prev => ({
      ...prev,
      achievements: [...prev.achievements, {
        id: Date.now().toString(),
        title: '',
        description: '',
        date: ''
      }]
    }));
  };

  const updateAchievement = (id: string, field: string, value: string) => {
    setCvData(prev => ({
      ...prev,
      achievements: prev.achievements.map(ach => 
        ach.id === id ? { ...ach, [field]: value } : ach
      )
    }));
  };

  const removeAchievement = (id: string) => {
    setCvData(prev => ({
      ...prev,
      achievements: prev.achievements.filter(ach => ach.id !== id)
    }));
  };

  const addProject = () => {
    setCvData(prev => ({
      ...prev,
      projects: [...prev.projects, {
        id: Date.now().toString(),
        name: '',
        description: '',
        technologies: '',
        link: ''
      }]
    }));
  };

  const updateProject = (id: string, field: string, value: string) => {
    setCvData(prev => ({
      ...prev,
      projects: prev.projects.map(proj => 
        proj.id === id ? { ...proj, [field]: value } : proj
      )
    }));
  };

  const removeProject = (id: string) => {
    setCvData(prev => ({
      ...prev,
      projects: prev.projects.filter(proj => proj.id !== id)
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  // Render read-only CV view for other users
  if (isViewingOtherUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${targetUserId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <h1 className="font-semibold text-lg">CV Profile</h1>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-4xl mx-auto space-y-6">
          {savedCV ? (
            <>
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-700">Full Name</h3>
                      <p className="text-gray-900">{savedCV.fullName || 'Not provided'}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700">Account Type</h3>
                      <Badge variant="secondary">{savedCV.accountType}</Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700">Email</h3>
                      <p className="text-gray-900">{savedCV.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700">Phone</h3>
                      <p className="text-gray-900">{savedCV.phone || 'Not provided'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h3 className="font-semibold text-gray-700">Location</h3>
                      <p className="text-gray-900">{savedCV.location || 'Not provided'}</p>
                    </div>
                  </div>
                  {savedCV.summary && (
                    <div>
                      <h3 className="font-semibold text-gray-700">Professional Summary</h3>
                      <p className="text-gray-900 mt-2">{savedCV.summary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Experience */}
              {savedCV.experience && savedCV.experience.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Work Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {savedCV.experience.map((exp: any) => (
                      <div key={exp.id} className="border-l-4 border-blue-500 pl-4">
                        <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                        <p className="font-medium text-blue-600">{exp.company}</p>
                        <p className="text-sm text-gray-600">{exp.duration}</p>
                        {exp.description && <p className="text-gray-700 mt-2">{exp.description}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {savedCV.education && savedCV.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      Education
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {savedCV.education.map((edu: any) => (
                      <div key={edu.id} className="border-l-4 border-green-500 pl-4">
                        <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                        <p className="font-medium text-green-600">{edu.institution}</p>
                        <p className="text-sm text-gray-600">{edu.year}</p>
                        {edu.description && <p className="text-gray-700 mt-2">{edu.description}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {savedCV.skills && savedCV.skills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {savedCV.skills.map((skill: string, index: number) => (
                        <Badge key={index} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Languages */}
              {savedCV.languages && savedCV.languages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Languages className="w-5 h-5" />
                      Languages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {savedCV.languages.map((language: string, index: number) => (
                        <Badge key={index} variant="outline">{language}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Projects */}
              {savedCV.projects && savedCV.projects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Projects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {savedCV.projects.map((project: any) => (
                      <div key={project.id} className="border-l-4 border-purple-500 pl-4">
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-gray-700 mt-1">{project.description}</p>
                        {project.technologies && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Technologies:</strong> {project.technologies}
                          </p>
                        )}
                        {project.link && (
                          <a 
                            href={project.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View Project
                          </a>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Achievements */}
              {savedCV.achievements && savedCV.achievements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {savedCV.achievements.map((achievement: any) => (
                      <div key={achievement.id} className="border-l-4 border-yellow-500 pl-4">
                        <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                        <p className="text-sm text-gray-600">{achievement.date}</p>
                        <p className="text-gray-700 mt-1">{achievement.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No CV Available</h3>
                <p className="text-gray-600">This user hasn't created a CV yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h1 className="font-semibold text-lg">My CV</h1>
          </div>
        </div>
        
        <Button 
          onClick={() => saveCVMutation.mutate(cvData)}
          disabled={saveCVMutation.isPending}
          className="bg-gradient-to-r from-pink-500 to-purple-600"
        >
          <Save className="w-4 h-4 mr-2" />
          Save CV
        </Button>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <Input
                    value={cvData.fullName}
                    onChange={(e) => setCvData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Account Type</label>
                  <Select value={cvData.accountType} onValueChange={(value: any) => setCvData(prev => ({ ...prev, accountType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creator">Content Creator</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={cvData.email}
                    onChange={(e) => setCvData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    value={cvData.phone}
                    onChange={(e) => setCvData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <Input
                    value={cvData.location}
                    onChange={(e) => setCvData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, State, Country"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Professional Summary</label>
                <Textarea
                  value={cvData.summary}
                  onChange={(e) => setCvData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief professional summary highlighting your key strengths and experience"
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Work Experience
                </div>
                <Button onClick={addExperience} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Experience
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cvData.experience.map((exp) => (
                <div key={exp.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Experience Entry</h4>
                    <Button 
                      onClick={() => removeExperience(exp.id)} 
                      size="sm" 
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Company Name"
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                    />
                    <Input
                      placeholder="Position/Job Title"
                      value={exp.position}
                      onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                    />
                    <Input
                      placeholder="Duration (e.g., Jan 2020 - Present)"
                      value={exp.duration}
                      onChange={(e) => updateExperience(exp.id, 'duration', e.target.value)}
                    />
                  </div>
                  
                  <Textarea
                    placeholder="Job description and key achievements"
                    value={exp.description}
                    onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                  />
                </div>
              ))}
              
              {cvData.experience.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No work experience added yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Education
                </div>
                <Button onClick={addEducation} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Education
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cvData.education.map((edu) => (
                <div key={edu.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Education Entry</h4>
                    <Button 
                      onClick={() => removeEducation(edu.id)} 
                      size="sm" 
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Institution Name"
                      value={edu.institution}
                      onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                    />
                    <Input
                      placeholder="Degree/Qualification"
                      value={edu.degree}
                      onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                    />
                    <Input
                      placeholder="Year (e.g., 2018-2022)"
                      value={edu.year}
                      onChange={(e) => updateEducation(edu.id, 'year', e.target.value)}
                    />
                  </div>
                  
                  <Textarea
                    placeholder="Additional details, achievements, or relevant coursework"
                    value={edu.description}
                    onChange={(e) => updateEducation(edu.id, 'description', e.target.value)}
                  />
                </div>
              ))}
              
              {cvData.education.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No education added yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills & Languages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  />
                  <Button onClick={addSkill} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {cvData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <button onClick={() => removeSkill(skill)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a language"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                  />
                  <Button onClick={addLanguage} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {cvData.languages.map((language) => (
                    <Badge key={language} variant="secondary" className="flex items-center gap-1">
                      {language}
                      <button onClick={() => removeLanguage(language)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Achievements & Awards
                </div>
                <Button onClick={addAchievement} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Achievement
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cvData.achievements.map((achievement) => (
                <div key={achievement.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Achievement Entry</h4>
                    <Button 
                      onClick={() => removeAchievement(achievement.id)} 
                      size="sm" 
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Achievement Title"
                      value={achievement.title}
                      onChange={(e) => updateAchievement(achievement.id, 'title', e.target.value)}
                    />
                    <Input
                      placeholder="Date (e.g., March 2023)"
                      value={achievement.date}
                      onChange={(e) => updateAchievement(achievement.id, 'date', e.target.value)}
                    />
                  </div>
                  
                  <Textarea
                    placeholder="Description of the achievement"
                    value={achievement.description}
                    onChange={(e) => updateAchievement(achievement.id, 'description', e.target.value)}
                  />
                </div>
              ))}
              
              {cvData.achievements.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No achievements added yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Projects
                </div>
                <Button onClick={addProject} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cvData.projects.map((project) => (
                <div key={project.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Project Entry</h4>
                    <Button 
                      onClick={() => removeProject(project.id)} 
                      size="sm" 
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Project Name"
                      value={project.name}
                      onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Technologies Used"
                      value={project.technologies}
                      onChange={(e) => updateProject(project.id, 'technologies', e.target.value)}
                    />
                    <Input
                      placeholder="Project Link (optional)"
                      value={project.link}
                      onChange={(e) => updateProject(project.id, 'link', e.target.value)}
                      className="md:col-span-2"
                    />
                  </div>
                  
                  <Textarea
                    placeholder="Project description and your role"
                    value={project.description}
                    onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                  />
                </div>
              ))}
              
              {cvData.projects.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No projects added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}