import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Link,
} from "@react-email/components";

interface ContactConfirmationEmailProps {
  name: string;
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function ContactConfirmationEmail({ name }: ContactConfirmationEmailProps) {
  const firstName = name.split(" ")[0];

  return (
    <Html lang="en">
      <Head />
      <Body
        style={{
          backgroundColor: "#000000",
          fontFamily: FONT,
          margin: 0,
          padding: "32px 16px",
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: "#0a0a0a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Section
            style={{
              borderBottom: "1px solid #1e293b",
              padding: "24px 32px",
            }}
          >
            <Text
              style={{
                margin: "0 0 8px",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#6b7280",
              }}
            >
              dimeglio.dev
            </Text>
            <Heading
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: "700",
                color: "#ffffff",
                lineHeight: "1.3",
              }}
            >
              Got it, {firstName}.
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "24px 32px" }}>
            <Text
              style={{
                margin: "0 0 16px",
                fontSize: "15px",
                color: "#e2e8f0",
                lineHeight: "1.65",
              }}
            >
              Pablo received your message and will get back to you soon.
            </Text>

            <Text
              style={{
                margin: "0 0 16px",
                fontSize: "14px",
                color: "#94a3b8",
                lineHeight: "1.65",
              }}
            >
              While you wait, feel free to browse his work or connect on LinkedIn.
            </Text>

            <Hr style={{ borderColor: "#1e293b", margin: "20px 0" }} />

            {/* Links */}
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ paddingBottom: "12px" }}>
                    <Link
                      href="https://dimeglio.dev/projects"
                      style={{
                        display: "inline-block",
                        backgroundColor: "#111827",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        padding: "10px 16px",
                        fontSize: "13px",
                        color: "#e2e8f0",
                        textDecoration: "none",
                        fontWeight: "500",
                      }}
                    >
                      Browse projects →
                    </Link>
                  </td>
                  <td style={{ paddingBottom: "12px", paddingLeft: "8px" }}>
                    <Link
                      href="https://linkedin.com/in/dimegliopablo"
                      style={{
                        display: "inline-block",
                        backgroundColor: "#111827",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        padding: "10px 16px",
                        fontSize: "13px",
                        color: "#e2e8f0",
                        textDecoration: "none",
                        fontWeight: "500",
                      }}
                    >
                      LinkedIn →
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Footer */}
          <Section
            style={{
              borderTop: "1px solid #1e293b",
              padding: "16px 32px",
              backgroundColor: "#000000",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "11px",
                color: "#4b5563",
                textAlign: "center",
              }}
            >
              — Guillermo · Pablo&apos;s AI agent at{" "}
              <Link
                href="https://dimeglio.dev"
                style={{ color: "#6b7280", textDecoration: "none" }}
              >
                dimeglio.dev
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ContactConfirmationEmail;
