import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Hr,
  Link,
} from "@react-email/components";

interface ContactNotificationEmailProps {
  name: string;
  email: string;
  company?: string;
  message?: string;
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function ContactNotificationEmail({
  name,
  email,
  company,
  message,
}: ContactNotificationEmailProps) {
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
              backgroundColor: "#0a0a0a",
              borderBottom: "1px solid #1e293b",
              padding: "24px 32px",
            }}
          >
            <Row>
              <Column>
                {/* Purple dot + title */}
                <table style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingRight: "10px", verticalAlign: "middle" }}>
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            backgroundColor: "#a855f7",
                            borderRadius: "50%",
                            display: "inline-block",
                          }}
                        />
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <Text
                          style={{
                            margin: 0,
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: "#6b7280",
                          }}
                        >
                          dimeglio.dev
                        </Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <Heading
                  style={{
                    margin: "8px 0 0",
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#ffffff",
                    lineHeight: "1.3",
                  }}
                >
                  New lead from Guillermo
                </Heading>
              </Column>
            </Row>
          </Section>

          {/* Lead details */}
          <Section style={{ padding: "24px 32px" }}>
            <LeadRow label="Name" value={name} />
            <LeadRow label="Email" value={email} isEmail />
            {company && <LeadRow label="Company" value={company} />}

            {message && (
              <>
                <Hr style={{ borderColor: "#1e293b", margin: "20px 0" }} />
                <Text
                  style={{
                    margin: "0 0 8px",
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                  }}
                >
                  Message
                </Text>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#e2e8f0",
                    lineHeight: "1.6",
                    backgroundColor: "#111827",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message}
                </Text>
              </>
            )}
          </Section>

          {/* CTA */}
          <Section style={{ padding: "0 32px 24px" }}>
            <Link
              href={`mailto:${email}`}
              style={{
                display: "inline-block",
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "600",
                padding: "10px 20px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Reply to {name.split(" ")[0]}
            </Link>
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
              Sent via Guillermo · Pablo&apos;s AI agent at{" "}
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

function LeadRow({
  label,
  value,
  isEmail,
}: {
  label: string;
  value: string;
  isEmail?: boolean;
}) {
  return (
    <Row style={{ marginBottom: "12px" }}>
      <Column style={{ width: "80px", verticalAlign: "top" }}>
        <Text
          style={{
            margin: 0,
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6b7280",
            paddingTop: "1px",
          }}
        >
          {label}
        </Text>
      </Column>
      <Column>
        {isEmail ? (
          <Link
            href={`mailto:${value}`}
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#a855f7",
              textDecoration: "none",
            }}
          >
            {value}
          </Link>
        ) : (
          <Text
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#e2e8f0",
            }}
          >
            {value}
          </Text>
        )}
      </Column>
    </Row>
  );
}

export default ContactNotificationEmail;
