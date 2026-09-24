package handlers

import (
	"html"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
)

var (
	mailAddressPattern = regexp.MustCompile(`(?i)\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b`)
	phonePattern       = regexp.MustCompile(`[0-9０-９]{2,4}[\-ー－][0-9０-９]{2,4}[\-ー－][0-9０-９]{3,4}`)
	urlPattern         = regexp.MustCompile(`(?i)https?://[^\s<>"']+`)
	htmlTagPattern     = regexp.MustCompile(`(?s)<[^>]*>`)
	whitespacePattern  = regexp.MustCompile(`[ \t]+`)
)

type sanitizedMail struct {
	Subject string
	From    string
	Body    string
}

func sanitizeMailForAI(subject, from, body string) sanitizedMail {
	return sanitizedMail{
		Subject: sanitizeText(subject),
		From:    sanitizeSender(from),
		Body:    sanitizeBody(body),
	}
}

func sanitizeSender(value string) string {
	address, err := mail.ParseAddress(value)
	if err != nil {
		return maskMailAddresses(value)
	}

	parsed, err := mail.ParseAddress(address.Address)
	if err != nil {
		return "[SENDER]"
	}
	parts := strings.SplitN(parsed.Address, "@", 2)
	if len(parts) != 2 {
		return "[SENDER]"
	}
	return "[SENDER]@" + strings.ToLower(parts[1])
}

func sanitizeBody(value string) string {
	value = html.UnescapeString(value)
	value = htmlTagPattern.ReplaceAllString(value, " ")

	lines := strings.Split(strings.ReplaceAll(value, "\r\n", "\n"), "\n")
	kept := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, ">") || line == "--" {
			continue
		}
		kept = append(kept, line)
	}

	value = strings.Join(kept, "\n")
	value = sanitizeText(value)
	value = maskLabeledPersonalData(value)
	valueRunes := []rune(value)
	if len(valueRunes) > 12000 {
		value = string(valueRunes[:12000])
	}
	return value
}

func sanitizeText(value string) string {
	value = urlPattern.ReplaceAllStringFunc(value, func(raw string) string {
		parsed, err := url.Parse(strings.TrimRight(raw, ".,;:!?)]）"))
		if err != nil || parsed.Host == "" {
			return "[URL]"
		}
		return "[URL:" + strings.ToLower(parsed.Hostname()) + "]"
	})
	value = phonePattern.ReplaceAllString(value, "[PHONE]")
	return maskMailAddresses(value)
}

func maskMailAddresses(value string) string {
	return mailAddressPattern.ReplaceAllString(value, "[EMAIL]")
}

func maskLabeledPersonalData(value string) string {
	lines := strings.Split(value, "\n")
	for index, line := range lines {
		if strings.Contains(line, "氏名") || strings.Contains(line, "名前") || strings.Contains(line, "住所") {
			if separator := strings.IndexAny(line, ":："); separator >= 0 {
				lines[index] = line[:separator+1] + "[PERSONAL_DATA]"
			}
		}
	}
	return strings.Join(lines, "\n")
}

func compactMailBody(value string) string {
	lines := strings.Split(value, "\n")
	result := make([]string, 0, len(lines))
	for _, line := range lines {
		line = whitespacePattern.ReplaceAllString(strings.TrimSpace(line), " ")
		if line != "" {
			result = append(result, line)
		}
	}
	return strings.Join(result, "\n")
}
