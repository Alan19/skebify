import DOMPurify from "dompurify"
import type { PlasmoCSConfig } from "plasmo"
import React from "react"
import { renderToString } from "react-dom/server"

import type { SkebUserResponse } from "~lib"

// noinspection JSUnusedGlobalSymbols
export const config: PlasmoCSConfig = {
  matches: ["*://*.twitter.com/*", "*://*.x.com/*"]
}

async function upsertButton(data: SkebUserResponse) {
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page#html_sanitization
  const anchorHTML = buildSkebLink(data.screen_name, buildDescription(data))
  const headerItems = document.querySelector("[data-testid='UserProfileHeader_Items']")
  // remove existing skebify element
  const existing = headerItems.querySelector(".skeb")
  if (existing !== null) {
    existing.remove()
  }
  headerItems.insertAdjacentHTML("afterbegin", DOMPurify.sanitize(renderToString(anchorHTML)))
}

function SkebIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-14j79pv r-1gs4q39">
      <g>
        <rect
          x="7.59"
          y="4.44"
          transform="matrix(0.3231 -0.9464 0.9464 0.3231 0.3479 11.7668)"
          width="1.61"
          height="2.41"
        />
        <rect
          x="6.04"
          y="9"
          transform="matrix(0.3231 -0.9464 0.9464 0.3231 -5.0223 13.3813)"
          width="1.61"
          height="2.41"
        />
        <rect
          x="4.48"
          y="13.56"
          transform="matrix(0.3231 -0.9464 0.9464 0.3231 -10.3938 14.9961)"
          width="1.61"
          height="2.41"
        />
        <path
          d="M12,0C5.37,0,0,5.37,0,12s5.37,12,12,12s12-5.37,12-12S18.63,0,12,0z M13.76,4.98L8,21.88
        c-0.4-0.16-0.78-0.35-1.16-0.55l4.43-12.9l0.03-0.1l1.06-3.12l0.23-0.69L9.56,3.5L9.3,4.25l1.52,0.52L9.79,7.81L8.26,7.29
        L7.74,8.81l1.52,0.52l-1.03,3.04l-1.52-0.52l-0.54,1.52l1.52,0.52l-1.03,3.04l-1.52-0.51l-0.51,1.53l1.52,0.52l-0.68,1.96
        c-0.23-0.18-0.45-0.36-0.66-0.56l0.34-0.9l-1.68-0.57C2.13,16.6,1.34,14.39,1.34,12C1.34,6.11,6.11,1.34,12,1.34
        c4.37,0,8.12,2.63,9.76,6.38L13.76,4.98z"
        />
      </g>
    </svg>
  )
}

function buildSkebLink(name: string, descriptions: string[]) {
  // TODO: copy adjacent element styles instead
  return (
    <a
      href={`https://skeb.jp/@${name}`}
      target="_blank"
      role="link"
      data-focusable="true"
      className="skeb css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3 r-4qtqp9 r-1a11zyx r-1loqt21"
      rel="noopener noreferrer">
      <SkebIcon />
      <strong>
        {descriptions.join(" · ")}
      </strong>
    </a>
  )
}

function buildDescription(data: SkebUserResponse): string[] {
  const descriptions: string[] = []
  if (data.acceptable) {
    descriptions.push(
      chrome.i18n.getMessage("acceptable", data.default_amount.toLocaleString())
    )
  }

  if (data.agreed_creator_guidelines && data.received_works_count > 0) {
    descriptions.push(
      chrome.i18n.getMessage(
        "request",
        data.received_works_count.toLocaleString()
      )
    )
  }

  if (!descriptions.length) {
    if (data.sent_public_works_count > 0) {
      descriptions.push(
        chrome.i18n.getMessage(
          "sent_public_works",
          data.sent_public_works_count.toLocaleString()
        )
      )
    } else {
      descriptions.push(chrome.i18n.getMessage("registered"))
    }
  }
  return descriptions
}

// we're looking for "head > script[type='application/ld+json']" that contains the Twitter UID
let observer = new MutationObserver(async (mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.nodeName.toLowerCase() === "script"
      ) {
        const scriptNode = node as HTMLScriptElement
        if (scriptNode.getAttribute("type") === "application/ld+json") {
          const data = JSON.parse(scriptNode.innerText)
          const r = await chrome.runtime.sendMessage({
            id: data.mainEntity.identifier
          })
          await upsertButton(r)
          break
        }
      }
    }
  }
})
observer.observe(document.querySelector("head"), { childList: true })
