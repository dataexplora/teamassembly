import { useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded'
import { QRCodeSVG } from 'qrcode.react'

export function joinUrl(teamId: string) {
  return `${window.location.origin}/t/${teamId}`
}

export default function ShareQr({ teamId, teamName }: { teamId: string; teamName: string }) {
  const url = joinUrl(teamId)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked: the QR still works
    }
  }

  async function share() {
    try {
      await navigator.share({ title: teamName, text: `Join ${teamName} on Team Assembly`, url })
    } catch {
      // user cancelled
    }
  }

  return (
    <Stack spacing={2} sx={{ alignItems: "center" }}>
      <Box sx={{ bgcolor: '#fff', p: 2, borderRadius: 4, boxShadow: 3, lineHeight: 0 }}>
        <QRCodeSVG value={url} size={240} level="M" marginSize={0} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all', textAlign: 'center' }}>
        {url}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={copy}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        {'share' in navigator && (
          <Button variant="outlined" startIcon={<IosShareRoundedIcon />} onClick={share}>
            Share
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
