output "bucket_name" {
  value = aws_s3_bucket.web.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.web.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.web.id
}
