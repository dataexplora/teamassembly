import { Box, CardActionArea, Typography } from '@mui/material'
import type { LinkPreview } from '../linkPreview'

export default function LinkCard({ preview, mine }: { preview: LinkPreview; mine: boolean }) {
  return (
    <CardActionArea
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        mt: 1,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: mine ? 'rgba(0,0,0,0.18)' : 'background.paper',
        borderLeft: 3,
        borderColor: mine ? 'rgba(255,255,255,0.6)' : 'primary.main',
      }}
    >
      {preview.image && (
        <Box
          component="img"
          src={preview.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          // Hide the frame if the remote image is gone or blocks hotlinking
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.style.display = 'none')}
          sx={{ display: 'block', width: '100%', maxHeight: 180, objectFit: 'cover' }}
        />
      )}
      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography variant="caption" sx={{ opacity: 0.75, display: 'block' }} noWrap>
          {preview.site}
        </Typography>
        {preview.title && (
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {preview.title}
          </Typography>
        )}
        {preview.description && (
          <Typography
            variant="body2"
            sx={{
              opacity: 0.85,
              mt: 0.25,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {preview.description}
          </Typography>
        )}
      </Box>
    </CardActionArea>
  )
}
