package users

import (
	"absolute-cinema/db"
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey = []byte(os.Getenv("JWT_SECRET"))

func GenerateJWT(user User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID.Hex(),
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

func Register(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	user := User{
		ID:         primitive.NewObjectID(),
		Username:   req.Username,
		Email:      req.Email,
		Password:   string(hashed),
		Extensions: []string{},
	}
	// Check for existing user with same username or email
	existsFilter := bson.M{"$or": []bson.M{{"username": req.Username}, {"email": req.Email}}}
	var existing User
	err := db.GetUsers().FindOne(context.TODO(), existsFilter).Decode(&existing)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists."})
		return
	}
	_, err = db.GetUsers().InsertOne(context.TODO(), user)
	if err != nil {
		fmt.Println("MongoDB Insert Error:", err)
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists or DB error."})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}

func Login(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
	}
	var user User
	err := db.GetUsers().FindOne(
		context.TODO(),
		bson.M{"$or": []bson.M{{"username": req.Username}, {"email": req.Username}}},
	).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Username not found"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}
	tokenString, _ := GenerateJWT(user)
	c.JSON(http.StatusOK, gin.H{"token": tokenString, "username": user.Username, "extensions": user.Extensions})
}

func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing or wrong token."})
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token."})
			return
		}
		claims := token.Claims.(jwt.MapClaims)
		c.Set("username", claims["username"])
		c.Next()
	}
}

func GetExtensions(c *gin.Context) {
	username := c.GetString("username")
	var user User
	err := db.GetUsers().FindOne(context.TODO(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"extensions": user.Extensions})
}

func SetExtensions(c *gin.Context) {
	username := c.GetString("username")
	var req struct {
		Extensions []string `json:"extensions"`
	}
	if err := c.ShouldBindBodyWithJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Request"})
		return
	}
	_, err := db.GetUsers().UpdateOne(
		context.TODO(),
		bson.M{"username": username},
		bson.M{"$set": bson.M{"extensions": req.Extensions}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update extensions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Extensions updated"})
}

func GetMe(c *gin.Context) {
	username := c.GetString("username")
	var user User
	err := db.GetUsers().FindOne(context.TODO(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"username":   user.Username,
		"email":      user.Email,
		"extensions": user.Extensions,
	})
}
