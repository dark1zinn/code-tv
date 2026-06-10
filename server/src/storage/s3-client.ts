import { S3mini } from 's3mini';

export interface S3Config {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    bucket: string;
    region: string;
}

export function getS3Config(): S3Config {
    return {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'rustfsadmin',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'rustfsadmin',
        endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
        bucket: process.env.S3_BUCKET ?? 'codetv-dev',
        region: process.env.S3_REGION ?? 'us-east-1',
    };
}

export function buildS3Endpoint(baseUrl: string, bucket: string): string {
    return `${baseUrl.replace(/\/$/, '')}/${bucket}`;
}

export function createS3Client(config: S3Config = getS3Config()): S3mini {
    return new S3mini({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        endpoint: buildS3Endpoint(config.endpoint, config.bucket),
        region: config.region,
    });
}

export async function ensureBucket(s3: S3mini): Promise<void> {
    if (!(await s3.bucketExists())) {
        await s3.createBucket();
    }
}
