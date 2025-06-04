package zync;

import java.time.Duration;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import org.testng.Assert;

import java.util.List;

import io.github.bonigarcia.wdm.WebDriverManager;

public class ZyncAuthTest {
    private WebDriver driver;
    private WebDriverWait wait;
    private String appUrl = "http://localhost:5173/";

    @BeforeClass
    public void setUp() {
        WebDriverManager.firefoxdriver().setup();
        driver = new FirefoxDriver();
        driver.manage().window().maximize();
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    @Test(priority = 1, description = "Explore login page")
    public void exploreLoginPage() {
        driver.get(appUrl);

        wait.until(ExpectedConditions.or(
            ExpectedConditions.presenceOfElementLocated(By.tagName("body")),
            ExpectedConditions.titleContains("Zync")
        ));

        String title = driver.getTitle();
        String currentUrl = driver.getCurrentUrl();

        System.out.println("Title: " + title);
        System.out.println("URL: " + currentUrl);

        wait.until(ExpectedConditions.presenceOfElementLocated(By.tagName("input")));

        List<WebElement> inputs = driver.findElements(By.tagName("input"));
        List<WebElement> buttons = driver.findElements(By.tagName("button"));

        System.out.println("Inputs: " + inputs.size());
        System.out.println("Buttons: " + buttons.size());

        for (int i = 0; i < inputs.size(); i++) {
            WebElement input = inputs.get(i);
            String type = input.getAttribute("type");
            String placeholder = input.getAttribute("placeholder");
            String name = input.getAttribute("name");

            System.out.println("Input " + (i+1) + ": type =" + type + ", placeholder = " + placeholder + ", name= " + name);
        }

        for (int i = 0; i < buttons.size(); i++) {
            WebElement button = buttons.get(i);
            String text = button.getText();
            String type = button.getAttribute("type");

            if (!text.trim().isEmpty()) {
                System.out.println("Button " + (i+1) + ": '" + text + "' (type=" + type + ")");
            }
        }

        Assert.assertTrue(inputs.size() > 0);
        System.out.println("login page loaded");
    }

    @Test(priority = 2, description = "Find and interact with login")
    public void findLoginForm() {
        driver.get(appUrl);

        WebElement emailField = null;
        String[] emailSelectors = {
            "input[type='email']",
            "input[placeholder*='email']", 
            "input[placeholder*='Email']",
            "input[name='email']",
            "input[name='username']"
        };

        for (String selector : emailSelectors) {
            try {
                emailField = wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector(selector)));
                break;
            } catch (Exception e) {
                System.out.println("not found with: " + selector);
            }
        }

        WebElement passwordField = null;
        String[] passwordSelectors = {
            "input[type='password']",
            "input[placeholder*='password']",
            "input[placeholder*='Password']",
            "input[name='password']"
        };

        for (String selector : passwordSelectors) {
            try {
                passwordField = wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector(selector)));
                break;
            } catch (Exception e) {
                System.out.println("not found with: " + selector);
            }
        }

        WebElement loginButton = null;
        try {
            loginButton = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("button[type='submit']")));
        } catch (Exception e) {
            List<WebElement> allButtons = driver.findElements(By.tagName("button"));
            for (WebElement button : allButtons) {
                String text = button.getText().toLowerCase();
                if (text.contains("login") || text.contains("sign in") || text.contains("log in")) {
                    loginButton = button;
                    System.out.println("Found login button: " + button.getText());
                    break;
                }
            }
        }

        System.out.println("Email " + (emailField != null ? "Found" : "Not Found"));
        System.out.println("Password " + (passwordField != null ? "Found" : "Not Found"));

        boolean canLogin = (emailField != null && passwordField != null && loginButton != null);

        System.out.println("Ready for login: " + canLogin);
    }

    @Test(priority = 3, description = "Test login")
    public void testLogin() {
        driver.get(appUrl);

        WebElement emailField = wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("input[type='email']")));
        WebElement passwordField = wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("input[type='password']")));

        emailField.clear();
        emailField.sendKeys("valantis@valantis.gr");
        
        passwordField.clear();
        passwordField.sendKeys("valantis");

        System.out.println("entered login creds");

        WebElement loginButton = wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//button[text()='Sign In']")));
        System.out.println("found sign in button");

        loginButton.click();

        try {
            boolean loginFormDisappeared = wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector("input[type='email']")));

            
        } catch (Exception e) {
            // TODO: handle exception
        }
    }

    @AfterClass
    public void tearDown() {
        if (driver != null) {
            System.out.println("closing...");
            driver.quit();
        }
    }
}
