// const axios = require('axios');
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path'); // Thêm path để xử lý đường dẫn
// const { MongoClient } = require('mongodb');
// const dotenv = require('dotenv');
import axios from 'axios';
import puppeteer from 'puppeteer';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { MongoClient } from 'mongodb';

dotenv.config();

const cpcCategories = ['cpc2', 'cpc3', 'cpc4', 'cpc5'];

const cloneVideos = async (url, filepath) => {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
        });
        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filepath);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Failed to download ${url}:`, error.message);
    }
};

//get Yesterday
const getYesterdayFormatted = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`;
};

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        // executablePath: '/path/to/your/chrome/or/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--ignore-certificate-errors'],
    });
    const page = await browser.newPage();
    
    try {
        await page.goto('https://www.thomoe.in/', { waitUntil: 'networkidle2' });
    } catch (error) {
        console.error('Error navigating to the page:', error);
        await browser.close();
        return;
    }
    
    // Lấy tất cả các giá trị src từ các thẻ
    const links = await page.evaluate(() => {
        // const anchors = document.querySelectorAll('a');
        // const hrefs = [];

        const buttons = document.querySelectorAll('button');
        const srcLinks = [];
        // anchors.forEach(anchor => {
        //     const href = anchor.getAttribute('href');
        //     if (href && href.includes('https://www.thomom.com/2024/')) {
        //         hrefs.push(href);
        //     }
        // });

        buttons.forEach(button => {
            const onclickAttr = button.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/src='([^']+)'/);
                if (match && match[1]) {
                    srcLinks.push(match[1]);
                }
            }
        });
        return srcLinks;
        // return hrefs;
    });
    console.log(links)

    // Duyệt qua từng link và lấy src của video
    for(const link of links) {
        await page.goto(link, { waitUntil: 'networkidle2' });

        // const videoSrcs = await page.evaluate(() => {
        //     const videos = document.querySelectorAll('video.vjs-tech source');
        //     const srcs = [];
        //     videos.forEach(video => {
        //         const src = video.getAttribute('src');
        //         if(src) {
        //             srcs.push(src);
        //         }
        //     });
        //     return srcs;
        // })

        const today = new Date();
        const folderName = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        // Tạo thư mục theo ngày hiện tại
        const folderPath = path.join(process.cwd(), 'public', 'media', 'videos', folderName);

        // Tải và lưu video
        const client = new MongoClient(process.env.DATABASE_URI);
        try {
            await client.connect();
            const db = client.db();
            const videoSave = db.collection('media');
            
            // for (const src of videoSrcs) {
            for (const src of links) {
                //check exist
                const existingSrc = await videoSave.findOne({
                    original_link: src,
                });
                if(existingSrc) {
                    console.log(`Skipping download: ${src} already exists in the database.`);
                    continue;
                }

                const match = src.match(/cpc\d+/);

                if(match) {
                    const cpcFolder = match[0];
                    //tạo forder dựa trên phần đầu tên
                    const specificFolderPath = path.join(process.cwd(), 'public', 'media', 'videos', cpcFolder);

                    // if (!fs.existsSync(folderPath)) {
                    //     fs.mkdirSync(folderPath, { recursive: true });
                    // }
                    if (!fs.existsSync(specificFolderPath)) {
                        fs.mkdirSync(specificFolderPath, { recursive: true });
                    }

                    // const filesInForder = fs.readdirSync(folderPath);
                    const filesInForder = fs.readdirSync(specificFolderPath);
                    const nextIndex = filesInForder.length + 1;

                    const filename = `${cpcFolder}_${folderName}_${nextIndex}.mp4`;
                    // const filePath = path.join(folderPath, filename);
                    const filePath = path.join(specificFolderPath, filename);
                    await cloneVideos(src, filePath);
                    console.log(`Downloaded and saved ${filePath}`);

                    const cate = cpcFolder;

                    //convert link save
                    const relativeFilePath = filePath.replace(path.join(process.cwd(), 'public'), '').replace(/\\/g, '/');

                    //save database
                    if(fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
                        await videoSave.insertOne({
                            title: `Video ${cpcFolder}_${nextIndex}`,
                            videoUrl: relativeFilePath,
                            category: cate,
                            isPublic: false,
                            original_link: src,
                        });
                    } else {
                        console.log(`Failed to download: ${relativeFilePath} is invalid or empty`);
                    }
                }
            }
        } catch (error) {
            console.log('Error saving to database:', error);
        } finally {
            await client.close();
        }
    }

    await browser.close();
})();