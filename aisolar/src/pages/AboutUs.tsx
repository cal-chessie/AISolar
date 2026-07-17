import { motion } from 'framer-motion';
import { Award, Shield, Users, Phone, Mail, MapPin, CheckCircle, Sun, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SiteNavigation from '@/components/layout/SiteNavigation';
import SEOHead from '@/components/SEOHead';
import { brand, getPhoneLink, getEmailLink } from '@/config/brand';

export default function AboutUs() {
  const teamMembers = [
    {
      name: 'John Murphy',
      role: 'Founder & CEO',
      description: 'Over 15 years experience in renewable energy',
      emoji: '👨‍💼'
    },
    {
      name: 'Sarah O\'Brien',
      role: 'Head of Operations',
      description: 'SEAI certified energy assessor',
      emoji: '👩‍💻'
    },
    {
      name: 'Michael Collins',
      role: 'Lead Installer',
      description: 'RECI certified electrician',
      emoji: '👷'
    },
    {
      name: 'Emma Walsh',
      role: 'Customer Success',
      description: 'Dedicated to customer satisfaction',
      emoji: '👩‍🔧'
    }
  ];

  const values = [
    {
      icon: Shield,
      title: 'Quality First',
      description: 'We only use tier-1 solar panels and inverters with industry-leading warranties.'
    },
    {
      icon: Users,
      title: 'Customer Focused',
      description: 'Your satisfaction is our priority. We guide you through every step of the process.'
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'AI-powered analysis and cutting-edge solar technology for maximum efficiency.'
    },
    {
      icon: Award,
      title: 'Certified Excellence',
      description: 'SEAI registered, RECI certified, and fully insured for your peace of mind.'
    }
  ];

  return (
    <>
      <SEOHead
        title={`About ${brand.name} | Solar Experts in Ireland`}
        description={`Learn about ${brand.name}, Ireland's leading AI-powered solar installation company. SEAI registered, RECI certified, with ${brand.stats.yearsInBusiness} years experience.`}
        keywords="solar company Ireland, about us, solar installers Dublin, SEAI registered installer"
      />

      <div className="min-h-screen bg-background">
        <SiteNavigation />

        <main>
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-b">
            <div className="container mx-auto px-4 py-12 sm:py-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-3xl mx-auto"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Sun className="h-4 w-4" />
                  {brand.stats.yearsInBusiness} Years in Business
                </div>
                <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
                  About <span className="text-primary">{brand.name}</span>
                </h1>
                <p className="text-lg text-muted-foreground">
                  We're on a mission to make solar energy accessible to every Irish home. 
                  Using AI-powered analysis and expert installation, we help families save 
                  on electricity while reducing their carbon footprint.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-12 border-b">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { value: brand.stats.customers, label: 'Happy Customers' },
                  { value: brand.stats.savingsGenerated, label: 'Savings Generated' },
                  { value: brand.stats.installationsCompleted, label: 'Installations' },
                  { value: brand.stats.googleRating, label: 'Google Rating' }
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-2xl sm:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Values Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Our Values</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  What sets us apart from other solar installers in Ireland
                </p>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {values.map((value, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="h-full">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                          <value.icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{value.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{value.description}</CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Certifications */}
          <section className="py-16 bg-muted/50 border-y">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Our Certifications</h2>
                <p className="text-muted-foreground">Fully certified and insured for your peace of mind</p>
              </motion.div>

              <div className="flex flex-wrap items-center justify-center gap-8">
                {brand.certifications.map((cert, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 bg-background rounded-xl px-6 py-4 shadow-sm border"
                  >
                    <CheckCircle className="h-6 w-6 text-primary" />
                    <span className="font-medium">{cert.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Team Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Meet Our Team</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Experienced professionals dedicated to your solar journey
                </p>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {teamMembers.map((member, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="text-center">
                      <CardHeader>
                        <div className="text-5xl mb-4">{member.emoji}</div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <CardDescription className="text-primary font-medium">
                          {member.role}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{member.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-primary/10 border-t">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Get In Touch</h2>
                <p className="text-muted-foreground">
                  Ready to start your solar journey? Contact us today!
                </p>
              </motion.div>

              <div className="max-w-2xl mx-auto">
                <Card>
                  <CardContent className="p-6 sm:p-8">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <a 
                        href={getPhoneLink()} 
                        className="flex items-center gap-4 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Call Us</div>
                          <div className="font-semibold">{brand.contact.phoneDisplay}</div>
                        </div>
                      </a>

                      <a 
                        href={getEmailLink('Enquiry from Website')} 
                        className="flex items-center gap-4 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Email Us</div>
                          <div className="font-semibold">{brand.contact.email}</div>
                        </div>
                      </a>

                      <div className="sm:col-span-2 flex items-center gap-4 p-4 rounded-xl bg-muted">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Location</div>
                          <div className="font-semibold">{brand.contact.address}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 text-center">
                      <Button size="lg" onClick={() => window.location.href = '/upload'}>
                        <Zap className="h-5 w-5 mr-2" />
                        Get Free Solar Analysis
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t bg-background">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-primary" />
                <span className="font-semibold">{brand.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {brand.name}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
