"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
}

export default function SearchModal({
  open,
  onOpenChange,
  search,
  setSearch,
}: SearchModalProps) {
  return (    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-xl p-0 border border-white/5 shadow-2xl max-w-md animate-in fade-in-50 slide-in-from-top-10 duration-300">
        <div className="relative w-full overflow-hidden" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-xl p-[2px] [mask:linear-gradient(#fff_0px,#fff_100%)_content-box,linear-gradient(#fff_0px,#fff_100%)]">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 animate-gradient-worm"></div>
          </div>
          
          <div className="relative bg-black/80 backdrop-blur-xl rounded-xl overflow-hidden px-6 py-6">
            <DialogHeader className="mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <DialogTitle className="text-lg font-bold bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent">
                  Search
                </DialogTitle>
              </div>
            </DialogHeader>
            
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search movies..."
              autoFocus
              className="w-full px-4 py-3 h-12 rounded-xl bg-black/40 border border-white/10 text-white/90 placeholder:text-white/40 focus:border-white/30 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
            
            <div className="mt-4 text-xs text-white/40">
              Type to search for movies, TV shows, and more
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}