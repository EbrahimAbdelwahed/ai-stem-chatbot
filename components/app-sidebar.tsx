'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { textArtifact } from '@/artifacts/text/client'; // Import the text artifact
import { DocumentSkeleton } from '@/components/document-skeleton'; // Import skeleton for loading

// Mock data for the text reader - replace with actual data fetching or props
const mockTextData = {
  title: "The Art of Reading",
  paragraphs: [
    "Reading is a gateway to countless worlds, a journey undertaken in the quietude of one's mind. It's an active engagement, a conversation between the author and the reader.",
    "To truly absorb the essence of a text, one must cultivate a focused mind. Minimize distractions, find a comfortable nook, and allow the words to paint vivid imagery.",
    "Visual retention is key. Techniques such as chunking text, using typographic hierarchy, and incorporating subtle visual cues can significantly enhance comprehension and memory.",
    "The rhythm of the text, the cadence of sentences, and the strategic use of white space all contribute to a more immersive and retentive reading experience. Let's explore these elements.",
    "Ultimately, reading is not just about decoding words, but about understanding ideas, empathizing with characters, and expanding one's perspective. It's a skill that enriches life immeasurably."
  ],
  conclusion: "Happy reading!"
};

// Simple component to render the text in a curated format
const TextReaderDisplay = ({ title, paragraphs, conclusion }: { title: string, paragraphs: string[], conclusion: string }) => {
  return (
    <div className="p-4 text-sm text-foreground">
      <h2 className="text-xl font-semibold mb-4 text-primary">{title}</h2>
      {paragraphs.map((p, index) => (
        <p key={index} className="mb-3 leading-relaxed first-letter:text-2xl first-letter:font-bold first-letter:mr-1 first-letter:float-left">
          {p}
        </p>
      ))}
      <p className="mt-6 text-center text-muted-foreground italic">{conclusion}</p>
    </div>
  );
};


export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  // You would replace this with actual logic to determine if text should be shown
  const showTextReader = true;
  // You would replace this with actual data for the text artifact
  const artifactData = {
    content: mockTextData.paragraphs.join('\n\n'),
    // other properties as needed by textArtifact.content
  };
  const artifactMetadata = { suggestions: [] }; // Mock metadata

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Chatbot
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2 h-fit"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {showTextReader ? (
          // textArtifact.content({ // TODO: This is causing a type error, need to investigate
          //   mode: 'view',
          //   status: 'done',
          //   content: artifactData.content,
          //   isCurrentVersion: true,
          //   currentVersionIndex: 0,
          //   onSaveContent: () => {},
          //   getDocumentContentById: () => '',
          //   isLoading: false,
          //   metadata: artifactMetadata,
          // })
          <TextReaderDisplay title={mockTextData.title} paragraphs={mockTextData.paragraphs} conclusion={mockTextData.conclusion} />
        ) : (
          <SidebarHistory user={user} />
        )}
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
