/**
 * Caractères autorisés pour le titre d'une opération :
 * - lettres (accents inclus), chiffres, espaces, ! @ #
 */
const OPERATION_TITLE_REGEX = /^[\p{L}\p{N}\s!@#]{1,10}$/u;

/**
 * Caractères autorisés pour la description d'une opération :
 * - lettres (accents inclus), chiffres, espaces
 * - ponctuation courante : . , : - ( ) ' " ? /
 *
 * Exclus volontairement : @ < > # ` * _ ~ | [ ] \ et autres symboles
 * (mentions Discord, markdown, injections).
 */
const OPERATION_DESCRIPTION_REGEX = /^[\p{L}\p{N}\s.,:()'"?¿¡/-]{1,1000}$/u;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isValidOperationTitle(value) {
	if (typeof value !== 'string' || value.length === 0 || value.length > 10) {
		return false;
	}

	if (!OPERATION_TITLE_REGEX.test(value)) {
		return false;
	}

	if (/@(everyone|here)/i.test(value)) {
		return false;
	}

	return true;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isValidOperationDescription(value) {
	if (typeof value !== 'string' || value.length === 0 || value.length > 1000) {
		return false;
	}

	// Défense en profondeur contre les pings globaux même si @ était ajouté au charset plus tard.
	if (/@(everyone|here)/i.test(value)) {
		return false;
	}

	if (!OPERATION_DESCRIPTION_REGEX.test(value)) {
		return false;
	}

	return true;
}

module.exports = {
	OPERATION_TITLE_REGEX,
	OPERATION_DESCRIPTION_REGEX,
	isValidOperationTitle,
	isValidOperationDescription,
};
