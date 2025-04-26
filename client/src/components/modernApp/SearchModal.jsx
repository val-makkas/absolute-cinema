import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function SearchModal({ open, onOpenChange, search, setSearch }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{
        background: 'rgba(0, 0, 0, 0.80)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 40, 0.37)',
        borderRadius: 22,
        border: '1.5px solid #23272f',
        padding: '2.5rem 2rem',
        minWidth: 420,
        maxWidth: 520,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        color: '#e5e5e5',
      }}>
        <DialogHeader style={{ width: '100%' }}>
          <DialogTitle style={{ color: '#e5e5e5', fontWeight: 900, fontSize: 28, letterSpacing: 1 }}>Search</DialogTitle>
        </DialogHeader>
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search movies..."
          autoFocus
          style={{ marginTop: 24, width: '100%' }}
        />
      </DialogContent>
    </Dialog>
  );
}
