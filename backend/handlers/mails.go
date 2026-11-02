package handlers

import (
	"context"
	"encoding/base64"
	"log"
	"net/http"
	"strings"

	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

func resolveUserAccessToken(c *gin.Context) (string, string, error) {
	uid, err := authenticatedUserID(c)
	if err != nil {
		return "", "", err
	}
	var user models.User
	if err := config.DB.First(&user, "id = ?", uid).Error; err != nil {
		return "", "", err
	}
	return user.AccessToken, user.Email, nil
}

type MailSummary struct {
	ID      string `json:"id"`
	Subject string `json:"subject"`
	From    string `json:"from"`
	Date    string `json:"date"`
	Snippet string `json:"snippet"`
}

type MailDetail struct {
	ID      string `json:"id"`
	Subject string `json:"subject"`
	From    string `json:"from"`
	Date    string `json:"date"`
	Body    string `json:"body"`
}

type MailListResponse struct {
	Mails         []MailSummary `json:"mails"`
	NextPageToken string        `json:"nextPageToken,omitempty"`
}

func GetMailsHandler(c *gin.Context) {
	ctx := context.Background()
	accessToken, userRef, err := resolveUserAccessToken(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証ユーザーのトークン取得に失敗しました"})
		return
	}
	uid, _ := authenticatedUserID(c)
	includeEmails, excludeEmails, err := loadMailFilterSettings(uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールフィルターの取得に失敗しました: " + err.Error()})
		return
	}
	token := &oauth2.Token{AccessToken: accessToken}
	client := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))
	srv, err := gmail.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "初期化失敗"})
		return
	}
	query := config.BuildGmailQuery(includeEmails, excludeEmails)
	log.Printf("[DEBUG] Generated Gmail Query: %s", query)
	request := srv.Users.Messages.List("me").Q(query).MaxResults(10)
	if pageToken := strings.TrimSpace(c.Query("pageToken")); pageToken != "" {
		request = request.PageToken(pageToken)
	}
	res, err := request.Do()
	if err != nil {
		log.Printf("[ERROR] Gmail API Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gmail APIの呼び出し失敗", "details": err.Error()})
		return
	}
	log.Printf("[DEBUG] Fetched message count: %d", len(res.Messages))
	mails := make([]MailSummary, 0)
	for _, m := range res.Messages {
		msg, err := srv.Users.Messages.Get("me", m.Id).Format("metadata").MetadataHeaders("Subject", "From", "Date").Do()
		if err != nil {
			continue
		}
		var subject, from, date string
		for _, h := range msg.Payload.Headers {
			switch h.Name {
			case "Subject":
				subject = h.Value
			case "From":
				from = h.Value
			case "Date":
				date = h.Value
			}
		}
		mails = append(mails, MailSummary{ID: m.Id, Subject: subject, From: from, Date: date, Snippet: msg.Snippet})
	}
	_ = userRef
	c.JSON(http.StatusOK, MailListResponse{Mails: mails, NextPageToken: res.NextPageToken})
}

func HandleFetchMails(c *gin.Context) { GetMailsHandler(c) }

func GetMailDetailHandler(c *gin.Context) {
	id := c.Param("id")
	ctx := context.Background()
	accessToken, _, err := resolveUserAccessToken(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証ユーザーのトークン取得に失敗しました"})
		return
	}
	srv, err := gmail.NewService(ctx, option.WithHTTPClient(oauth2.NewClient(ctx, oauth2.StaticTokenSource(&oauth2.Token{AccessToken: accessToken}))))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gmailサービスの初期化に失敗しました"})
		return
	}
	msg, err := srv.Users.Messages.Get("me", id).Format("full").Do()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メール詳細の取得に失敗しました"})
		return
	}
	var subject, from, date string
	for _, h := range msg.Payload.Headers {
		switch h.Name {
		case "Subject":
			subject = h.Value
		case "From":
			from = h.Value
		case "Date":
			date = h.Value
		}
	}
	body, err := extractGmailBody(msg.Payload)
	if err != nil || strings.TrimSpace(body) == "" {
		body = msg.Snippet
	}
	c.JSON(http.StatusOK, MailDetail{ID: id, Subject: subject, From: from, Date: date, Body: body})
}

func extractGmailBody(part *gmail.MessagePart) (string, error) {
	if part == nil {
		return "", nil
	}
	if part.MimeType == "text/plain" && part.Body != nil && part.Body.Data != "" {
		decoded, err := decodeGmailData(part.Body.Data)
		return string(decoded), err
	}
	for _, child := range part.Parts {
		body, err := extractGmailBody(child)
		if err != nil || strings.TrimSpace(body) != "" {
			return body, err
		}
	}
	if part.MimeType == "text/html" && part.Body != nil && part.Body.Data != "" {
		decoded, err := decodeGmailData(part.Body.Data)
		return string(decoded), err
	}
	return "", nil
}

func decodeGmailData(value string) ([]byte, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(value)
	if err == nil {
		return decoded, nil
	}
	return base64.URLEncoding.DecodeString(value)
}
