# SaleSense PRD

## Document Status

- Status: Draft v1
- Date: 2026-03-28
- Product: SaleSense
- Context: Hackathon build for a team of four developers

## 1. Product Summary

SaleSense is a webapp that turns a retail demo device into a virtual salesperson for electronics stores such as Apple, Samsung, or Best Buy-style environments. Each device can be configured by a store manager to represent a specific product. When idle, the device shows promotional media. When a customer engages, the app shifts into a conversational sales mode that can explain the product, ask questions about the customer's needs, compare alternatives, and guide the customer toward the best-fit product in the store.

The product goal is twofold:

1. Reduce the dependence on a large in-store sales staff.
2. Improve the consistency and quality of the customer experience with an always-available, product-aware, positive sales agent.

This PRD is written for a shallow-wide hackathon approach: reach a thin but real MVP quickly, then ship richer end-to-end milestones during the same hackathon.

## 2. Problem

Electronics retailers have three recurring issues on the sales floor:

- A limited number of salespeople cannot actively assist every customer at every display.
- Sales quality varies by person, mood, training, and product knowledge.
- Customers often leave without getting a clear recommendation or follow-up path.

SaleSense addresses this by giving each demo device a product-specific sales agent that is always available, grounded in store-managed product knowledge, and able to redirect the customer toward a better-fit alternative when appropriate.

## 3. Product Goals

### Primary Goals

- Let a store manager configure a product-specific sales experience on each demo device.
- Provide a customer-facing conversational agent that can sell the active product and compare it against other products in the same store.
- Support voice-first interaction with typed chat as a fallback.
- Capture qualified leads for store follow-up.
- Keep the experience fully web-based and deployable on Vercel with Supabase and Gemini.

### Secondary Goals

- Make the experience bilingual in English and Spanish.
- Return the app to an idle promotional mode when the interaction ends.
- Add client-side attention detection in a later milestone without sending frames to an external inference service.

### Non-Goals For The Hackathon

- Checkout, reservations, or payment flow.
- Multi-store admin or enterprise-level chain management.
- Open-ended web browsing during customer conversations.
- Automatic product ingestion from manufacturer or retailer URLs.
- Full transcript retention by default.

## 4. Target Users

### Store Manager

The store manager logs in, creates or edits product records, chooses which product a specific device is currently representing, switches the device into customer mode, and reviews captured leads.

### Customer

The customer approaches a device, wakes the experience, talks with the virtual salesperson, explores product fit, and optionally leaves contact information for follow-up.

### Sales Staff

The human sales team uses captured leads and summaries for follow-up after the interaction. They are not a core application user in the hackathon build, but the output should be useful to them.

## 5. Core Product Principles

- Each device represents one active product at a time.
- The active product has rich knowledge.
- All other products have short shared comparison snippets.
- The agent is persuasive but should still redirect the customer when another product is clearly a better fit.
- The customer experience should feel simple and kiosk-like, not like a complex admin app.
- The system should be grounded in store-managed content rather than making unsupported claims.

## 6. Core User Flows

### Seller Setup Flow

1. Store manager logs in.
2. Store manager sees a list of products configured for the store.
3. Store manager creates a new product or edits an existing one.
4. Store manager selects a product for the current device.
5. Store manager confirms launch into customer view.
6. The tab stays on the device in customer mode.

### Customer Sales Flow

1. The device shows idle media for the active product.
2. The customer taps the screen to start in the first milestones.
3. The agent greets the customer and begins the conversation. In Milestone 1 this is typed chat; from Milestone 2 onward it is voice-first with typed fallback.
4. The agent asks qualifying questions about the customer's needs.
5. The agent pitches the active product and points out relevant features the customer can try on the device.
6. If another in-store product is a better fit, the agent explains why and redirects the customer toward it.
7. At the end of the conversation, the agent asks for lead details.
8. The app saves the lead with an AI-generated summary and returns to idle after inactivity or explicit session completion.

### Late-Milestone Wake-Up Flow

1. The device shows idle media.
2. Client-side face detection runs locally in the browser.
3. If a face is detected in front of the screen, the app may prompt or auto-transition into the wake-up state.
4. No camera frames are uploaded or stored.

## 7. Functional Requirements

### 7.1 Seller Interface

The seller-facing interface must support:

- Store manager authentication via Supabase Auth.
- A product list for the current store.
- Product creation.
- Product editing.
- Device launch into customer mode for a selected product.
- A lead list view for captured customer interest.

### 7.2 Product Model Authoring

Each product record must include:

- Product name.
- Brand.
- Category.
- Markdown document with detailed product information.
- Idle media asset, either image or video.
- Short comparison snippet for cross-sell and redirection use by other agents.

Optional product fields may include:

- Key demo tips for what the customer should physically try on the device.
- Internal tags or sales notes.

### 7.3 Customer Interface

The customer-facing interface must support:

- Idle promotional state.
- Tap-to-wake interaction in early milestones.
- Typed chat in Milestone 1.
- Voice-first chat from Milestone 2 onward.
- Typed chat fallback.
- English and Spanish conversations.
- Product qualification questions.
- Responses grounded in the active product markdown.
- Comparisons against other products using shared snippets.
- Lead capture at the end of the interaction.
- Reset back to idle after inactivity.

### 7.4 Lead Capture

The lead form must capture:

- Name.
- Email address, required.
- Phone number, optional.

The system must also save:

- AI-generated summary of customer needs.
- Inferred interested product from the conversation.
- Recommended next action or next best product.

The hackathon version should store a summary by default, not the full conversation transcript.

### 7.5 Agent Behavior

The agent must:

- Be helpful, upbeat, and sales-oriented.
- Ask questions to understand customer intent before recommending.
- Use active product knowledge as the primary source of truth.
- Use other products' snippets only for concise comparisons and redirection.
- Avoid making unsupported claims when information is missing.
- Prefer guiding the customer toward a better-fit product over forcing the current one.

The agent must not:

- Attempt checkout or payment.
- Browse the open web in the hackathon scope.
- Store or infer sensitive biometric identity attributes.

## 8. Hackathon Milestones

### Milestone 1: Thin End-to-End MVP

Goal: Ship the smallest real experience that proves the product.

Includes:

- Next.js app deployed on Vercel.
- Supabase Auth for store manager login.
- Product CRUD with markdown, idle media, and comparison snippet.
- Customer view with idle media and tap-to-wake.
- Typed chat with Gemini.
- Grounded answers using active product markdown plus other-product snippets.
- Lead capture with name, email, optional phone, and stored AI summary.

Excludes:

- Voice chat.
- Attention detection.

### Milestone 2: Richer In-Store Sales Experience

Goal: Make the interaction feel like a real virtual salesperson.

Includes:

- Voice-first chat.
- Typed fallback maintained.
- English and Spanish support.
- Better qualifying-question prompts.
- Better product redirection behavior.
- Lead review UI in the seller dashboard.
- Session reset after inactivity.

Excludes:

- Attention detection.

### Milestone 3: Passive Wake-Up And Local Attention Detection

Goal: Reduce friction in starting the interaction.

Includes:

- Client-side face detection in the customer view.
- Wake-up logic based on face presence in front of the screen.
- Tap-to-wake retained as fallback.
- Camera notice in the UI.
- Local-only inference with no frame upload and no image storage.
- Face detection runtime and model assets served from the Vercel-hosted frontend origin when feasible, so the browser fetches code and model files from the app itself rather than relying on a third-party inference endpoint.

Implementation note:

- Use a browser-side Face Detector library, not an external detection API.
- Host runtime and model assets under the frontend app when possible.
- If same-origin asset serving becomes a blocker, static CDN delivery is acceptable only for asset download, never for frame-by-frame inference.

## 9. Recommended Technical Direction

### Frontend And Backend

- Framework: Next.js
- Deployment: Vercel
- Database and auth: Supabase
- LLM provider: Gemini via API key from Google Cloud

### AI Grounding

- The active product's markdown is the main knowledge base for the current salesperson.
- Each other product contributes a short markdown comparison snippet.
- The prompt should explicitly instruct the model to compare products only using known store data.

### Voice

- Voice is a milestone-two requirement.
- Text chat must remain available as fallback and as a practical hackathon backup.

### Attention Detection

- Attention detection is not part of the first two milestones.
- For the final milestone, use a browser-side Face Detector implementation that runs locally.
- The browser should fetch the detector runtime and model assets from the Vercel frontend server when possible.
- No camera frames should be uploaded to any external inference service.

## 10. Data Model

### Store Manager

- id
- store_id
- name
- email
- role

### Product

- id
- store_id
- name
- brand
- category
- details_markdown
- idle_media_url
- comparison_snippet_markdown
- created_at
- updated_at

### Device Session

- id
- store_id
- product_id
- launched_by_manager_id
- state
- started_at
- last_activity_at

### Lead

- id
- store_id
- product_id
- customer_name
- customer_email
- customer_phone
- ai_summary
- inferred_interest
- next_best_product
- created_at

## 11. UX Requirements

- Customer mode must be visually simple and kiosk-friendly.
- The idle state should always make it obvious how to start the interaction.
- The chat should default to voice once voice is available.
- Typed input must always remain available.
- The lead form should be short and low-friction.
- Seller flows should be utilitarian and fast.
- The customer should never see seller controls while in customer mode.

## 12. Privacy And Trust

- Camera usage is not required until milestone three.
- When camera-based wake-up is added, the app must show a clear on-screen camera notice.
- Frames must be processed locally in the browser.
- Frames must not be uploaded or persisted.
- The app should not infer identity, gender, age, or emotion.
- Conversation retention should default to summary-level storage for follow-up.

## 13. Success Criteria

The hackathon build is successful if a team can demo the following:

1. A manager logs in and configures a product.
2. A device is launched into customer mode.
3. A customer starts a conversation and receives a grounded sales interaction.
4. The agent can recommend either the active product or a better-fit alternative from the same store.
5. The app captures a lead and stores a useful summary for follow-up.
6. In the final milestone, the device can wake using local face detection without uploading camera frames to an external service.

## 14. Risks And Constraints

- Voice adds integration complexity and should have a typed fallback at all times.
- Product quality will depend heavily on the quality of seller-authored markdown.
- Cross-sell performance will depend on how well comparison snippets are written.
- Attention detection should not block the earlier milestones.
- The app must remain stable even if camera permissions are denied.

## 15. Explicit Scope Decisions

- One store, many devices.
- One named manager role per store for the hackathon.
- Lead capture is in scope.
- Checkout is out of scope.
- Open web browsing is out of scope for the hackathon.
- Attention detection is only in the final milestone.
- Face detection must run client-side and should be served from the app origin when possible.
