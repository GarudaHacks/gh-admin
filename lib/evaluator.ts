export const calculateAge = (dateOfBirth: string): number => {
	try {
		const birth = new Date(dateOfBirth);
		const today = new Date();
		let age = today.getFullYear() - birth.getFullYear();
		const monthDiff = today.getMonth() - birth.getMonth();
		if (
			monthDiff < 0 ||
			(monthDiff === 0 && today.getDate() < birth.getDate())
		) {
			age--;
		}
		return age;
	} catch {
		return 0;
	}
};