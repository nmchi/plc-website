import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { ListBlock as ListBlockProps, Media } from '@/payload-types'
import VideoList from '@/components/VideoList'

export const ListBlock: React.FC<ListBlockProps & { category: string, isPublic: boolean }> = async (props) => {
    const { category, isPublic } = props;

    let videos: Media[] = []

    const payload = await getPayload({ config: configPromise })

    const fetchVideos = await payload.find({
        collection: 'media',
        depth: 1,
        limit: 50,
        where: {
            category: {
                equals: category,
            },
            isPublic: {
                equals: true,
            }
        }
    })
    videos = fetchVideos.docs
    
    return (
        <div className='my-16'>
            <VideoList videos={videos} />
        </div>
    )
}