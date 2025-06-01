
'use client';
import type React from 'react';
import { Home, Tag, Folder, Settings, LogOut, Users, ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import KlippedLogo from './klipped-logo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Zone, Tag as TagType } from '@/types'; // Renamed Collection to Zone

const mockZones: Zone[] = [ // Renamed mockCollections to mockZones
  { id: '1', name: 'Work Projects', icon: Folder },
  { id: '2', name: 'Reading List', icon: Folder },
  { id: '3', name: 'Recipes', icon: Folder },
  { id: '4', name: 'Travel Ideas', icon: Folder },
];

const mockTags: TagType[] = [
  { id: 't1', name: 'productivity' },
  { id: 't2', name: 'nextjs' },
  { id: 't3', name: 'design' },
  { id: 't4', name: 'inspiration' },
  { id: 't5', name: 'ai' },
];

const AppSidebar: React.FC = () => {
  return (
    <aside className="hidden border-r bg-sidebar md:block w-64 fixed top-0 left-0 h-full z-20">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-16 items-center border-b px-6">
          <KlippedLogo />
        </div>
        <ScrollArea className="flex-1 py-2 px-4">
          <nav className="grid items-start gap-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Home className="h-4 w-4" />
              All Links
            </Link>

            <Accordion type="multiple" defaultValue={['zones', 'tags']} className="w-full"> {/* Renamed collections to zones */}
              <AccordionItem value="zones"> {/* Renamed collections to zones */}
                <AccordionTrigger className="px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Folder className="h-4 w-4" />
                    Zones {/* Renamed Collections to Zones */}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4">
                  {mockZones.map((zone) => ( // Renamed mockCollections to mockZones, collection to zone
                    <Link
                      key={zone.id}
                      href={`/zones/${zone.id}`} // Renamed collections to zones
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                    >
                      {zone.icon && <zone.icon className="h-4 w-4" />}
                      {zone.name}
                    </Link>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80 mt-1 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground">
                    <Plus className="h-4 w-4 mr-2" /> Add Zone {/* Renamed Add Collection to Add Zone */}
                  </Button>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tags">
                <AccordionTrigger className="px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4" />
                    Tags
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4">
                  {mockTags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tags/${tag.id}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                    >
                       # {tag.name}
                    </Link>
                  ))}
                   <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80 mt-1 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground">
                    <Plus className="h-4 w-4 mr-2" /> Manage Tags
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </ScrollArea>
        <div className="mt-auto p-4 border-t">
           <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
             <LogOut className="h-4 w-4 mr-2" />
             Logout
           </Button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
