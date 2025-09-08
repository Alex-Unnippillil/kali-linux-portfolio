variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix for all created resources"
  type        = string
  default     = "kali-portfolio"
}
